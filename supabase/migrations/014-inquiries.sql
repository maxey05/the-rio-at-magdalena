-- RFC-014: event and prenup inquiries.
--
-- Safe to re-run: "if not exists" everywhere. Run it once on the live database:
-- Supabase dashboard > SQL Editor > New query > paste > Run.
--
-- inquiries never touch booking_nights or bookings, so an inquiry can never
-- block a date. Access model (D-081): RLS is ON with NO policies and the anon
-- and authenticated roles have no privileges; only the server (service_role)
-- reads and writes this table.
--
-- type uses the labels shown on the form. status is new -> replied -> closed
-- (an admin can also reopen to new). email is stored lowercase by the app so
-- the "3 inquiries per email per Manila day" count is case-insensitive.

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

alter table inquiries enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on inquiries from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on inquiries from authenticated;
  end if;
end
$$;

-- service_role must be able to use the tables. Newer Supabase projects no
-- longer grant this automatically, which shows up as 'permission denied for
-- table ...' (42501) from the server. Safe to re-run.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Make the Data API notice new tables and grants right away.
notify pgrst, 'reload schema';
