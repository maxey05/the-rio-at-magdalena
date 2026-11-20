-- The Rio At Magdalena: full database schema (RFC-004).
--
-- Safe to re-run: every statement is "if not exists" / "create or replace" /
-- idempotent. Re-running does NOT alter an existing table; later changes to
-- tables go in supabase/migrations/NNN-*.sql.
--
-- How to run: Supabase dashboard > SQL Editor > New query > paste > Run.
--
-- Access model (D-081): only the server talks to the database, using the
-- service_role key. Row Level Security is ON for every table with NO policies,
-- so the public anon key can read and write nothing. The functions below are
-- also locked to service_role (see the end of this file).
--
-- `email_log` (RFC-007) and `inquiries` (RFC-014) are at the end of the table
-- definitions. supabase/migrations/014-inquiries.sql adds `inquiries` to a
-- database that was set up before RFC-014.

create extension if not exists pgcrypto;


-- ---------------------------------------------------------------------------
-- camps: Camp 1..4. Inactive camps show as "Coming soon" and are never bookable.
-- ---------------------------------------------------------------------------
create table if not exists camps (
  id smallint generated always as identity primary key,
  name text not null unique,
  description text not null default '',
  sort smallint not null default 0,
  active boolean not null default true
);


-- ---------------------------------------------------------------------------
-- slots: one pitch, booked by one group per night (D-011).
-- map_x / map_y: pin position as a percent of the camp photo's width / height.
-- ---------------------------------------------------------------------------
create table if not exists slots (
  id smallint generated always as identity primary key,
  camp_id smallint not null references camps(id),
  code text not null,
  description text not null default '',
  sort smallint not null default 0,
  map_x numeric(5,2),
  map_y numeric(5,2),
  active boolean not null default true,
  unique (camp_id, code)
);


-- ---------------------------------------------------------------------------
-- settings: exactly one row (id is always true). Admin-editable (D-025).
-- Column defaults mirror DEFAULT_SETTINGS in lib/rules.ts.
-- ---------------------------------------------------------------------------
create table if not exists settings (
  id boolean primary key default true check (id),
  overnight_adult int not null default 500,
  overnight_reduced int not null default 350,
  day_adult int not null default 300,
  day_reduced int not null default 200,
  tent_price int not null default 500,
  tent_stock smallint not null default 5,
  slot_capacity smallint not null default 10,
  site_cap smallint not null default 100,
  window_days smallint not null default 90,
  max_nights smallint not null default 7,
  hold_minutes smallint not null default 30,
  downpayment_pct smallint not null default 50 check (downpayment_pct between 1 and 100),
  gcash_name text,
  gcash_number text,
  gcash_qr_path text,
  deposit_note text not null default 'Amount confirmed at check-in',
  contact_phone text,
  contact_email text,
  updated_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- closures: dates the campsite is closed (bad weather, high river). Inclusive.
-- ---------------------------------------------------------------------------
create table if not exists closures (
  id bigint generated always as identity primary key,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  reason text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- bookings: one row per booking. Money is integer pesos (R-10).
-- check_out is the morning the guests leave (check_in + nights).
-- Status list is the one in R-09; keep it identical to the TypeScript union.
-- ---------------------------------------------------------------------------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  access_token text not null unique,
  kind text not null check (kind in ('overnight', 'day_tour')),
  check_in date not null,
  nights smallint not null check (nights between 0 and 30),
  check_out date generated always as (check_in + nights) stored,
  guest_name text not null,
  email text not null,
  mobile text not null,
  notes text not null default '',
  adults smallint not null default 0 check (adults >= 0),
  seniors smallint not null default 0 check (seniors >= 0),
  kids smallint not null default 0 check (kids >= 0),
  infants smallint not null default 0 check (infants >= 0),
  guests int generated always as (adults + seniors + kids + infants) stored,
  tents smallint not null default 0 check (tents >= 0),
  slot_ids smallint[] not null default '{}',
  adult_rate int not null,
  reduced_rate int not null,
  tent_rate int not null,
  total int not null,
  downpayment int not null,
  balance int not null,
  status text not null check (status in (
    'awaiting_payment', 'payment_review', 'confirmed', 'checked_in',
    'completed', 'expired', 'rejected', 'cancelled', 'no_show'
  )),
  hold_expires_at timestamptz,
  gcash_ref text,
  proof_path text,
  proof_submitted_at timestamptz,
  decided_at timestamptz,
  decided_by text,
  reject_reason text,
  checked_in_at timestamptz,
  balance_collected int,
  deposit_amount int,
  deposit_returned boolean,
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by in ('guest', 'admin')),
  cancel_reason text,
  refund_status text not null default 'none' check (refund_status in ('none', 'due', 'sent')),
  refund_ref text,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'day_tour' and nights = 0 and tents = 0) or (kind = 'overnight' and nights >= 1)),
  check (guests >= 1)
);

create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_check_in_idx on bookings (check_in);

-- One GCash reference can back only one live booking (D-042). A cancelled,
-- rejected or expired booking releases its reference.
create unique index if not exists bookings_active_gcash_ref on bookings (gcash_ref)
  where gcash_ref is not null
    and status in ('payment_review', 'confirmed', 'checked_in', 'completed');


-- ---------------------------------------------------------------------------
-- booking_nights: one row per slot per night while a booking holds the slot.
-- The primary key IS the double-booking guard (D-082): Postgres itself refuses
-- a second row for the same slot and night. Rows are deleted when the booking
-- is cancelled, rejected or expired. Never write here from app code (R-13).
-- ---------------------------------------------------------------------------
create table if not exists booking_nights (
  booking_id uuid not null references bookings(id) on delete cascade,
  slot_id smallint not null references slots(id),
  night date not null,
  primary key (slot_id, night)
);

create index if not exists booking_nights_booking_idx on booking_nights (booking_id);


-- ---------------------------------------------------------------------------
-- email_log: one row per send attempt (RFC-007). A failed email never undoes
-- the action that caused it; the admin resends from the log. A resend adds a
-- new row with status 'resent'. error holds the SMTP error, or 'dev-preview'
-- when GMAIL_USER is unset and the email was only printed to the console.
-- inquiry_id is plain text with no foreign key, so an inquiry email never
-- depends on the inquiries table. Deleting a booking keeps its log rows.
-- ---------------------------------------------------------------------------
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'proof_received', 'confirmed', 'rejected', 'cancelled', 'refund_sent',
    'admin_new_proof', 'admin_guest_cancelled', 'admin_inquiry'
  )),
  booking_id uuid references bookings(id) on delete set null,
  inquiry_id text,
  recipient text not null,
  subject text not null,
  body text not null,
  status text not null check (status in ('sent', 'failed', 'resent')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists email_log_created_idx on email_log (created_at desc);
create index if not exists email_log_booking_idx on email_log (booking_id);
create index if not exists email_log_failed_idx on email_log (created_at desc) where status = 'failed';


-- ---------------------------------------------------------------------------
-- inquiries (RFC-014): event and prenup inquiries from /events. Never touches
-- booking_nights or bookings, so an inquiry cannot block a date. type uses the
-- labels shown on the form. status is new -> replied -> closed. email is stored
-- lowercase by the app so the 3-per-email-per-Manila-day limit is
-- case-insensitive.
-- ---------------------------------------------------------------------------
create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  mobile text not null check (char_length(mobile) between 7 and 20),
  email text not null check (char_length(email) between 3 and 254),
  type text not null check (type in ('Intimate event', 'Prenup shoot', 'Other')),
  preferred_date date,
  guests smallint not null check (guests between 1 and 300),
  message text not null check (char_length(message) between 10 and 1000),
  status text not null default 'new' check (status in ('new', 'replied', 'closed')),
  admin_note text not null default '' check (char_length(admin_note) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists inquiries_status_created_idx on inquiries (status, created_at desc);


-- ---------------------------------------------------------------------------
-- Row Level Security: ON everywhere, NO policies. The anon and authenticated
-- roles can therefore read and write nothing (D-081). As defence in depth the
-- table privileges are revoked too; service_role bypasses RLS and keeps access.
-- ---------------------------------------------------------------------------
alter table camps enable row level security;
alter table slots enable row level security;
alter table settings enable row level security;
alter table closures enable row level security;
alter table bookings enable row level security;
alter table booking_nights enable row level security;
alter table email_log enable row level security;
alter table inquiries enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on camps, slots, settings, closures, bookings, booking_nights, email_log, inquiries from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on camps, slots, settings, closures, bookings, booking_nights, email_log, inquiries from authenticated;
  end if;
end
$$;

-- service_role must be able to use the tables. Newer Supabase projects no
-- longer grant this automatically, which shows up as 'permission denied for
-- table ...' (42501) from the server. Safe to re-run.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;


-- ---------------------------------------------------------------------------
-- is_active(b): does this booking hold capacity right now?
--   awaiting_payment counts only while its hold has not run out, so a stale
--   hold looks free even before expire_stale_holds() has cleaned it up.
--   payment_review, confirmed and checked_in always count.
-- Every availability and capacity read must use this helper.
-- ---------------------------------------------------------------------------
create or replace function is_active(b bookings)
returns boolean
language sql
stable
as $$
  select b.status in ('payment_review', 'confirmed', 'checked_in')
      or (b.status = 'awaiting_payment' and b.hold_expires_at > now());
$$;


-- ---------------------------------------------------------------------------
-- expire_stale_holds(): turns overdue awaiting_payment bookings into
-- 'expired' and frees their nights. Returns how many it expired.
-- "<= now()" is the exact complement of is_active's "> now()", so a hold is
-- never both active and expirable.
-- ---------------------------------------------------------------------------
create or replace function expire_stale_holds()
returns int
language plpgsql
as $$
declare
  v_count int;
begin
  with expired as (
    update bookings
       set status = 'expired'
     where status = 'awaiting_payment'
       and hold_expires_at <= now()
    returning id
  ), freed as (
    delete from booking_nights n
     using expired e
     where n.booking_id = e.id
    returning 1
  )
  select count(*) into v_count from expired;

  return v_count;
end;
$$;


-- ---------------------------------------------------------------------------
-- occupancy_between(from, to): one row per date, both ends included.
--   guests      overnight guests staying the night of d (check_in <= d < check_out)
--               plus day-tour guests on d (D-012, D-014). Active bookings only.
--   slots_taken slots held for the night of d. Active bookings only.
--   tents       tents in use the night of d.
--   closed      true if any closure covers d.
-- ---------------------------------------------------------------------------
create or replace function occupancy_between(p_from date, p_to date)
returns table (d date, guests int, slots_taken int, tents int, closed boolean)
language sql
stable
as $$
  select
    g.d::date,
    coalesce((
      select sum(b.guests)
        from bookings b
       where is_active(b)
         and ((b.kind = 'overnight' and g.d::date >= b.check_in and g.d::date < b.check_out)
           or (b.kind = 'day_tour' and b.check_in = g.d::date))
    ), 0)::int,
    (
      select count(*)
        from booking_nights n
        join bookings b on b.id = n.booking_id
       where n.night = g.d::date
         and is_active(b)
    )::int,
    coalesce((
      select sum(b.tents)
        from bookings b
       where is_active(b)
         and b.kind = 'overnight'
         and g.d::date >= b.check_in
         and g.d::date < b.check_out
    ), 0)::int,
    exists (
      select 1 from closures c
       where g.d::date between c.start_date and c.end_date
    )
  from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') as g(d);
$$;


-- ---------------------------------------------------------------------------
-- create_booking(p): the only way to create a booking (R-13). One call is one
-- transaction: the booking row and its booking_nights rows are created
-- together or not at all.
--
-- The app has already validated the input and computed prices, ref and access
-- token (lib/rules.ts) and passes them in p. This function does NOT re-check
-- the booking window (tomorrow .. +90 days) or max_nights: those are app rules
-- that depend on Manila "today". It guards what must hold for data integrity:
-- closures, site cap, tent stock, slot validity, slot capacity, no double-booking.
--
-- p keys: kind, check_in (YYYY-MM-DD), nights, guest_name, email, mobile,
-- notes, adults, seniors, kids, infants, tents, slot_ids (array), adult_rate,
-- reduced_rate, tent_rate, total, downpayment, balance, ref, access_token.
--
-- Errors (the exception message is the machine-readable code):
--   invalid_input         missing or inconsistent kind / date / nights / tents / guests
--   day_tour_slots        a day tour must have no slots (D-014)
--   slots_required        an overnight booking needs at least one slot
--   slot_invalid          a slot does not exist, is inactive, or its camp is inactive
--   slot_capacity         guests exceed settings.slot_capacity x number of slots (D-011)
--   closed                a night of the stay (or the day-tour date) is closed
--   site_full:<date>      site cap would be exceeded on <date> (YYYY-MM-DD)
--   tents_unavailable:<date>  tent stock would be exceeded on <date>
--   slot_taken            another booking holds a chosen slot on a chosen night
--                         (DETAIL says "slot_id=<id> night=<date>")
--
-- A stay of N nights occupies the nights check_in .. check_in + N - 1. The
-- check-out morning is not an occupied night, so a closure starting on the
-- check-out date does not block the stay, and a new stay may start that day.
-- ---------------------------------------------------------------------------
create or replace function create_booking(p jsonb)
returns table (id uuid, ref text, access_token text)
language plpgsql
as $$
#variable_conflict use_column
declare
  s settings%rowtype;
  v_kind text := p->>'kind';
  v_in date := (p->>'check_in')::date;
  v_nights int := coalesce((p->>'nights')::int, 0);
  v_tents int := coalesce((p->>'tents')::int, 0);
  v_guests int :=
      coalesce((p->>'adults')::int, 0) + coalesce((p->>'seniors')::int, 0)
    + coalesce((p->>'kids')::int, 0) + coalesce((p->>'infants')::int, 0);
  v_slots smallint[];
  v_last date;
  v_found int;
  v_d date;
  v_slot smallint;
  v_night date;
begin
  -- One global lock: bookings are few, so serializing them is fine and it
  -- removes the check-then-insert race between two simultaneous guests.
  perform pg_advisory_xact_lock(hashtext('rio-capacity'));

  -- Free overdue holds first so they cannot block this booking.
  perform expire_stale_holds();

  select * into s from settings limit 1;
  if not found then
    raise exception 'settings_missing';
  end if;

  if coalesce(v_kind, '') not in ('overnight', 'day_tour')
     or v_in is null
     or v_guests < 1
     or v_nights < 0
     or v_tents < 0
     or (v_kind = 'day_tour' and (v_nights <> 0 or v_tents <> 0))
     or (v_kind = 'overnight' and v_nights < 1) then
    raise exception 'invalid_input';
  end if;

  -- Distinct and sorted, so a repeated slot id cannot cause a false slot_taken.
  select coalesce(array_agg(distinct x::smallint order by x::smallint), '{}')
    into v_slots
    from jsonb_array_elements_text(
      case when jsonb_typeof(p->'slot_ids') = 'array' then p->'slot_ids' else '[]'::jsonb end
    ) as x;

  if v_kind = 'day_tour' then
    if cardinality(v_slots) > 0 then
      raise exception 'day_tour_slots';
    end if;
    v_last := v_in;
  else
    if cardinality(v_slots) = 0 then
      raise exception 'slots_required';
    end if;

    select count(*) into v_found
      from slots sl
      join camps c on c.id = sl.camp_id
     where sl.id = any(v_slots)
       and sl.active
       and c.active;
    if v_found <> cardinality(v_slots) then
      raise exception 'slot_invalid';
    end if;

    if v_guests > s.slot_capacity * cardinality(v_slots) then
      raise exception 'slot_capacity';
    end if;

    v_last := v_in + v_nights - 1;
  end if;

  if exists (select 1 from occupancy_between(v_in, v_last) o where o.closed) then
    raise exception 'closed';
  end if;

  select o.d into v_d
    from occupancy_between(v_in, v_last) o
   where o.guests + v_guests > s.site_cap
   order by o.d
   limit 1;
  if found then
    raise exception 'site_full:%', to_char(v_d, 'YYYY-MM-DD');
  end if;

  if v_kind = 'overnight' and v_tents > 0 then
    select o.d into v_d
      from occupancy_between(v_in, v_last) o
     where o.tents + v_tents > s.tent_stock
     order by o.d
     limit 1;
    if found then
      raise exception 'tents_unavailable:%', to_char(v_d, 'YYYY-MM-DD');
    end if;
  end if;

  -- Not inside the block below on purpose: a clash on ref or access_token
  -- must surface as its own unique_violation, not as "slot_taken".
  insert into bookings (
    ref, access_token, kind, check_in, nights,
    guest_name, email, mobile, notes,
    adults, seniors, kids, infants, tents, slot_ids,
    adult_rate, reduced_rate, tent_rate, total, downpayment, balance,
    status, hold_expires_at
  ) values (
    p->>'ref', p->>'access_token', v_kind, v_in, v_nights,
    p->>'guest_name', p->>'email', p->>'mobile', coalesce(p->>'notes', ''),
    coalesce((p->>'adults')::int, 0), coalesce((p->>'seniors')::int, 0),
    coalesce((p->>'kids')::int, 0), coalesce((p->>'infants')::int, 0),
    v_tents, v_slots,
    (p->>'adult_rate')::int, (p->>'reduced_rate')::int, (p->>'tent_rate')::int,
    (p->>'total')::int, (p->>'downpayment')::int, (p->>'balance')::int,
    'awaiting_payment', now() + make_interval(mins => s.hold_minutes)
  )
  returning bookings.id, bookings.ref, bookings.access_token
  into id, ref, access_token;

  if v_kind = 'overnight' then
    begin
      -- All slot x night rows in one statement; the primary key rejects any
      -- slot and night that is already held.
      insert into booking_nights (booking_id, slot_id, night)
      select id, sl, n::date
        from unnest(v_slots) as sl
       cross join generate_series(v_in::timestamp, v_last::timestamp, interval '1 day') as n;
    exception when unique_violation then
      select bn.slot_id, bn.night into v_slot, v_night
        from booking_nights bn
       where bn.slot_id = any(v_slots)
         and bn.night between v_in and v_last
       order by bn.night, bn.slot_id
       limit 1;
      raise exception 'slot_taken'
        using detail = format('slot_id=%s night=%s', v_slot, v_night);
    end;
  end if;

  return next;
end;
$$;


-- ---------------------------------------------------------------------------
-- release_booking(id, expected, new_status): the only way to end a booking's
-- hold on its slots (R-13, R-14). Locks the row; if its current status is in
-- p_expected, sets p_new_status, deletes its booking_nights and returns the
-- PREVIOUS status (RFC-011 uses it to decide whether a refund is owed).
-- Otherwise (wrong status, or no such booking) changes nothing and returns null.
-- ---------------------------------------------------------------------------
create or replace function release_booking(p_id uuid, p_expected text[], p_new_status text)
returns text
language plpgsql
as $$
declare
  v_old text;
begin
  select b.status into v_old from bookings b where b.id = p_id for update;

  if v_old is null or not (v_old = any(p_expected)) then
    return null;
  end if;

  update bookings set status = p_new_status where id = p_id;
  delete from booking_nights where booking_id = p_id;

  return v_old;
end;
$$;


-- ---------------------------------------------------------------------------
-- Storage buckets (RFC-008). Both private: payment proofs are never public
-- (R-17) and the GCash QR is served through short-lived signed URLs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('site', 'site', false)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- Function privileges. Postgres lets everyone (PUBLIC) execute new functions,
-- and Supabase exposes public functions to the anon key through its REST API
-- (POST /rest/v1/rpc/create_booking). Lock all of them to service_role so only
-- our server can call them.
-- ---------------------------------------------------------------------------
revoke execute on function is_active(bookings) from public, anon, authenticated;
revoke execute on function expire_stale_holds() from public, anon, authenticated;
revoke execute on function occupancy_between(date, date) from public, anon, authenticated;
revoke execute on function create_booking(jsonb) from public, anon, authenticated;
revoke execute on function release_booking(uuid, text[], text) from public, anon, authenticated;

grant execute on function is_active(bookings) to service_role;
grant execute on function expire_stale_holds() to service_role;
grant execute on function occupancy_between(date, date) to service_role;
grant execute on function create_booking(jsonb) to service_role;
grant execute on function release_booking(uuid, text[], text) to service_role;

-- Make the Data API notice new tables and grants right away.
notify pgrst, 'reload schema';
