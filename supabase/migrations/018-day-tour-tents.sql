-- Day tours can rent tents.
--
-- Before this, a day tour could not carry tents: the bookings table check forced
-- tents = 0 on a day tour, create_booking refused v_tents <> 0, and
-- occupancy_between only counted tents for overnight stays. Now a day tour may
-- rent tents. They are charged once (not per night) at the same tent price, and
-- they come out of the same tent stock as overnight tents for that date:
-- occupancy_between counts a day tour's tents on its own date, and
-- create_booking checks the stock for day tours too (tents_unavailable).
--
-- What this changes:
--   1. bookings: the unnamed check "day tour => nights = 0 and tents = 0" is
--      replaced by a named one that only requires nights = 0 for a day tour.
--   2. occupancy_between: tents column also sums day-tour tents on check_in.
--   3. create_booking: stops refusing tents on a day tour, and checks the tent
--      stock for both kinds.
--
-- Safe to re-run: the old check is only dropped if it is still there, and the
-- functions use "create or replace". Run it once on the live database:
-- Supabase dashboard > SQL Editor > New query > paste > Run.
-- Run 015-signed-contracts.sql, 016-day-tour-slots.sql and 017-max-nights-30.sql
-- first if you have not yet.
--
-- Existing bookings are unchanged: no existing day tour has tents.

do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.conrelid = 'bookings'::regclass
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) like '%day_tour%'
       and pg_get_constraintdef(con.oid) like '%tents = 0%'
  loop
    execute format('alter table bookings drop constraint %I', c.conname);
  end loop;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'bookings'::regclass
       and conname = 'bookings_kind_nights_check'
  ) then
    alter table bookings
      add constraint bookings_kind_nights_check
      check ((kind = 'day_tour' and nights = 0) or (kind = 'overnight' and nights >= 1));
  end if;
end;
$$;

-- occupancy_between(from, to): one row per date, both ends included.
--   guests      overnight guests staying the night of d (check_in <= d < check_out)
--               plus day-tour guests on d. Active bookings only.
--   slots_taken slots held for the night of d. Active bookings only.
--   tents       tents in use the night of d, plus tents of day tours on d.
--   closed      true if any closure covers d.
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
         and ((b.kind = 'overnight' and g.d::date >= b.check_in and g.d::date < b.check_out)
           or (b.kind = 'day_tour' and b.check_in = g.d::date))
    ), 0)::int,
    exists (
      select 1 from closures c
       where g.d::date between c.start_date and c.end_date
    )
  from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') as g(d);
$$;

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
     or (v_kind = 'day_tour' and v_nights <> 0)
     or (v_kind = 'overnight' and v_nights < 1) then
    raise exception 'invalid_input';
  end if;

  -- Distinct and sorted, so a repeated slot id cannot cause a false slot_taken.
  select coalesce(array_agg(distinct x::smallint order by x::smallint), '{}')
    into v_slots
    from jsonb_array_elements_text(
      case when jsonb_typeof(p->'slot_ids') = 'array' then p->'slot_ids' else '[]'::jsonb end
    ) as x;

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

  -- A day tour holds its slots only for its own date.
  if v_kind = 'day_tour' then
    v_last := v_in;
  else
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

  if v_tents > 0 then
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

  begin
    -- All slot x night rows in one statement; the primary key rejects any
    -- slot and night that is already held. A day tour writes one row per
    -- slot, for its own date.
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

  return next;
end;
$$;

notify pgrst, 'reload schema';
