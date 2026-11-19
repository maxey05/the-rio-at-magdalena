-- RFC-004 test script: booking functions, constraints and security.
--
-- How to run: run schema.sql, then seed.sql, then paste this WHOLE file into
-- Supabase > SQL Editor > New query > Run. The result is one table of lines;
-- every line should start with PASS, and the last line is the summary.
--
-- Nothing is kept: all test data is created inside a sub-transaction that is
-- rolled back at the end (sentinel error 'rollback_tests'), so your real
-- tables are untouched. The helper functions live in pg_temp and disappear
-- when the session ends. This form is used because the SQL editor only shows
-- the last result set, so a plain BEGIN ... ROLLBACK script could not show its
-- own PASS/FAIL lines.
--
-- Test dates are in the year 2099 so they never meet real bookings. The tests
-- set site_cap = 20 and tent_stock = 2 INSIDE the rolled-back transaction.

create or replace function pg_temp.pl(
  p_slots smallint[], p_in date, p_nights int,
  p_guests int default 2, p_tents int default 0, p_kind text default 'overnight'
) returns jsonb
language sql
as $$
  select jsonb_build_object(
    'kind', p_kind, 'check_in', p_in, 'nights', p_nights,
    'guest_name', 'Test Guest', 'email', 'test@example.com', 'mobile', '+639000000000',
    'adults', p_guests, 'seniors', 0, 'kids', 0, 'infants', 0, 'tents', p_tents,
    'slot_ids', to_jsonb(p_slots),
    'adult_rate', 500, 'reduced_rate', 350, 'tent_rate', 500,
    'total', 1000, 'downpayment', 500, 'balance', 500,
    'ref', 'T-' || substr(md5(random()::text), 1, 10),
    'access_token', md5(random()::text) || md5(random()::text)
  );
$$;

create or replace function pg_temp.try_cb(p jsonb) returns text
language plpgsql
as $$
begin
  perform create_booking(p);
  return 'ok';
exception when others then
  return sqlerrm;
end;
$$;

create or replace function pg_temp.try_sql(p_sql text) returns text
language plpgsql
as $$
begin
  execute p_sql;
  return '00000';
exception when others then
  return sqlstate;
end;
$$;

create or replace function pg_temp.ln(p_name text, p_ok boolean, p_got text default null) returns text
language sql
as $$
  select case when coalesce(p_ok, false) then 'PASS: ' || p_name
              else 'FAIL: ' || p_name || coalesce(' (got: ' || p_got || ')', '') end;
$$;

create or replace function pg_temp.run_tests() returns table (result text)
language plpgsql
as $$
declare
  res text[] := '{}';
  v_camp smallint;
  v_dead_camp smallint;
  t1 smallint;
  t2 smallint;
  t3 smallint;
  t4 smallint;
  t5 smallint;
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_txt text;
  v_n int;
  v_row record;
  v_ok boolean;
begin
  begin
    -- Seed checks (need seed.sql to have been run).
    select count(*) into v_n from camps where name in ('Camp 1', 'Camp 2', 'Camp 3', 'Camp 4');
    res := res || pg_temp.ln('seed: four camps exist', v_n = 4, v_n::text);
    select count(*) into v_n from camps where name in ('Camp 3', 'Camp 4') and not active;
    res := res || pg_temp.ln('seed: Camp 3 and Camp 4 are inactive', v_n = 2, v_n::text);
    select count(*) into v_n from camps where name in ('Camp 1', 'Camp 2') and active;
    res := res || pg_temp.ln('seed: Camp 1 and Camp 2 are active', v_n = 2, v_n::text);
    select string_agg(sl.code, ',' order by sl.sort) into v_txt
      from slots sl join camps c on c.id = sl.camp_id where c.name = 'Camp 1';
    res := res || pg_temp.ln('seed: Camp 1 slots A..I in order', v_txt = 'A,B,C,D,E,F,G,H,I', v_txt);
    select string_agg(sl.code, ',' order by sl.sort) into v_txt
      from slots sl join camps c on c.id = sl.camp_id where c.name = 'Camp 2';
    res := res || pg_temp.ln('seed: Camp 2 slots J,K,L1,L2,M,N,O in order', v_txt = 'J,K,L1,L2,M,N,O', v_txt);
    select count(*) into v_n from slots sl join camps c on c.id = sl.camp_id
      where c.name in ('Camp 1', 'Camp 2') and sl.map_x is not null and sl.map_y is not null
        and sl.map_x between 0 and 100 and sl.map_y between 0 and 100;
    res := res || pg_temp.ln('seed: all 16 slots have map_x/map_y between 0 and 100', v_n = 16, v_n::text);
    select count(*) into v_n from settings;
    select exists (
      select 1 from settings
       where overnight_adult = 500 and overnight_reduced = 350 and day_adult = 300 and day_reduced = 200
         and tent_price = 500 and tent_stock = 5
    ) into v_ok;
    res := res || pg_temp.ln('seed: one settings row with D-020..D-023 values', v_n = 1 and v_ok, v_n::text);

    -- Security checks.
    select count(*) into v_n from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r'
        and relname in ('camps', 'slots', 'settings', 'closures', 'bookings', 'booking_nights')
        and relrowsecurity;
    res := res || pg_temp.ln('rls: enabled on all 6 tables', v_n = 6, v_n::text);
    select count(*) into v_n from pg_policies where schemaname = 'public';
    res := res || pg_temp.ln('rls: no policies exist in public', v_n = 0, v_n::text);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      res := res || pg_temp.ln('security: anon cannot run create_booking',
        not has_function_privilege('anon', 'create_booking(jsonb)', 'execute'));
      res := res || pg_temp.ln('security: anon cannot run release_booking',
        not has_function_privilege('anon', 'release_booking(uuid, text[], text)', 'execute'));
      res := res || pg_temp.ln('security: anon cannot run expire_stale_holds',
        not has_function_privilege('anon', 'expire_stale_holds()', 'execute'));
      res := res || pg_temp.ln('security: anon cannot run occupancy_between',
        not has_function_privilege('anon', 'occupancy_between(date, date)', 'execute'));
      res := res || pg_temp.ln('security: anon cannot read bookings',
        not has_table_privilege('anon', 'bookings', 'select'));
      res := res || pg_temp.ln('security: authenticated cannot run create_booking',
        not has_function_privilege('authenticated', 'create_booking(jsonb)', 'execute'));
    else
      res := res || 'SKIP: anon role not found (not a Supabase database), security grants not checked';
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      res := res || pg_temp.ln('security: service_role can run create_booking',
        has_function_privilege('service_role', 'create_booking(jsonb)', 'execute'));
    end if;

    -- Test data (rolled back at the end): a test camp with 4 slots, and an
    -- inactive test camp with 1 slot.
    insert into settings (id) values (true) on conflict (id) do nothing;
    update settings set site_cap = 20, tent_stock = 2, slot_capacity = 10, hold_minutes = 30;
    insert into camps (name, active) values ('zz test camp', true) returning id into v_camp;
    insert into camps (name, active) values ('zz dead camp', false) returning id into v_dead_camp;
    insert into slots (camp_id, code) values (v_camp, 'T1') returning id into t1;
    insert into slots (camp_id, code) values (v_camp, 'T2') returning id into t2;
    insert into slots (camp_id, code) values (v_camp, 'T3') returning id into t3;
    insert into slots (camp_id, code) values (v_camp, 'T4') returning id into t4;
    insert into slots (camp_id, code) values (v_dead_camp, 'T5') returning id into t5;

    -- Double-booking: same slot, overlapping night.
    select cb.id into v_a from create_booking(pg_temp.pl(array[t1], '2099-03-10', 2)) cb;
    res := res || pg_temp.ln('slot_taken: first booking of T1 Mar 10-12 succeeds', v_a is not null);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-03-11', 2));
    res := res || pg_temp.ln('slot_taken: overlapping night on same slot is refused', v_txt = 'slot_taken', v_txt);
    select count(*) into v_n from bookings where check_in = '2099-03-11';
    res := res || pg_temp.ln('slot_taken: the refused booking left no row behind', v_n = 0, v_n::text);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t2, t1], '2099-03-09', 2));
    res := res || pg_temp.ln('slot_taken: refused when only one of several slots clashes', v_txt = 'slot_taken', v_txt);
    select count(*) into v_n from booking_nights where slot_id = t2;
    res := res || pg_temp.ln('slot_taken: no nights were kept for the free slot either', v_n = 0, v_n::text);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t2], '2099-03-11', 2));
    res := res || pg_temp.ln('slot_taken: a different slot on the same nights is fine', v_txt = 'ok', v_txt);

    -- Back-to-back stays on one slot (Dec 12-14, then Dec 14-15).
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-12-12', 2));
    res := res || pg_temp.ln('back-to-back: Dec 12-14 succeeds', v_txt = 'ok', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-12-14', 1));
    res := res || pg_temp.ln('back-to-back: Dec 14-15 on the same slot succeeds', v_txt = 'ok', v_txt);
    select count(*) into v_n from booking_nights where slot_id = t1 and night between '2099-12-12' and '2099-12-14';
    res := res || pg_temp.ln('back-to-back: nights are Dec 12, 13 and 14 (check-out morning is not a night)', v_n = 3, v_n::text);

    -- Site cap (20 in this test), day tours count.
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-06-10', 1, 10));
    res := res || pg_temp.ln('site_full: overnight 10 guests on Jun 10 succeeds', v_txt = 'ok', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(null, '2099-06-10', 0, 8, 0, 'day_tour'));
    res := res || pg_temp.ln('site_full: day tour of 8 on Jun 10 succeeds (18 of 20)', v_txt = 'ok', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t2], '2099-06-10', 1, 3));
    res := res || pg_temp.ln('site_full: overnight of 3 more is refused with the date (day tour counted)', v_txt = 'site_full:2099-06-10', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(null, '2099-06-10', 0, 3, 0, 'day_tour'));
    res := res || pg_temp.ln('site_full: a day tour of 3 more is refused too', v_txt = 'site_full:2099-06-10', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t2], '2099-06-09', 2, 3));
    res := res || pg_temp.ln('site_full: a stay whose second night is full reports that night', v_txt = 'site_full:2099-06-10', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t2], '2099-06-10', 1, 2));
    res := res || pg_temp.ln('site_full: landing exactly on the cap (20 of 20) succeeds', v_txt = 'ok', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t3], '2099-06-11', 1, 3));
    res := res || pg_temp.ln('site_full: the day before/after is not affected', v_txt = 'ok', v_txt);
    select o.guests, o.slots_taken into v_row from occupancy_between('2099-06-10', '2099-06-10') o;
    res := res || pg_temp.ln('occupancy_between: Jun 10 = 20 guests, 2 slots taken', v_row.guests = 20 and v_row.slots_taken = 2, v_row::text);
    select count(*) into v_n from occupancy_between('2099-06-09', '2099-06-12');
    res := res || pg_temp.ln('occupancy_between: returns one row per date, both ends included', v_n = 4, v_n::text);

    -- Tent stock (2 in this test).
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-07-10', 2, 2, 2));
    res := res || pg_temp.ln('tents: 2 tents on Jul 10-12 (the full stock) succeeds', v_txt = 'ok', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t2], '2099-07-11', 2, 2, 1));
    res := res || pg_temp.ln('tents: 1 more tent overlapping Jul 11 is refused with the date', v_txt = 'tents_unavailable:2099-07-11', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t2], '2099-07-11', 2, 2, 0));
    res := res || pg_temp.ln('tents: same dates with no tent still succeed', v_txt = 'ok', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t3], '2099-07-12', 1, 2, 2));
    res := res || pg_temp.ln('tents: tents are free again on the check-out date', v_txt = 'ok', v_txt);
    select o.tents into v_n from occupancy_between('2099-07-11', '2099-07-11') o;
    res := res || pg_temp.ln('occupancy_between: Jul 11 shows 2 tents', v_n = 2, v_n::text);

    -- Closures (Aug 10-11 inclusive).
    insert into closures (start_date, end_date, reason, created_by) values ('2099-08-10', '2099-08-11', 'test', 'test');
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-08-09', 2));
    res := res || pg_temp.ln('closed: stay whose second night is closed is refused', v_txt = 'closed', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-08-11', 1));
    res := res || pg_temp.ln('closed: stay on the last closed date is refused (end date inclusive)', v_txt = 'closed', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(null, '2099-08-10', 0, 2, 0, 'day_tour'));
    res := res || pg_temp.ln('closed: day tour on a closed date is refused', v_txt = 'closed', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-08-08', 2));
    res := res || pg_temp.ln('closed: stay checking out on the first closed date is allowed', v_txt = 'ok', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-08-12', 1));
    res := res || pg_temp.ln('closed: the day after the closure is open', v_txt = 'ok', v_txt);
    select o.closed into v_row from occupancy_between('2099-08-10', '2099-08-10') o;
    res := res || pg_temp.ln('occupancy_between: closed flag is true on a closed date', v_row.closed, v_row::text);

    -- Expiry of holds.
    select cb.id into v_a from create_booking(pg_temp.pl(array[t1], '2099-09-10', 1, 4)) cb;
    select hold_expires_at = now() + interval '30 minutes' into v_ok from bookings where id = v_a;
    res := res || pg_temp.ln('hold: a new booking holds for settings.hold_minutes (30)', v_ok);
    select is_active(b) into v_row from bookings b where b.id = v_a;
    res := res || pg_temp.ln('is_active: fresh awaiting_payment hold is active', v_row.is_active, v_row::text);
    update bookings set hold_expires_at = now() - interval '1 minute' where id = v_a;
    select is_active(b) into v_row from bookings b where b.id = v_a;
    res := res || pg_temp.ln('is_active: stale awaiting_payment hold is NOT active', not v_row.is_active, v_row::text);
    select o.guests, o.slots_taken into v_row from occupancy_between('2099-09-10', '2099-09-10') o;
    res := res || pg_temp.ln('occupancy_between: stale hold looks free before expire runs', v_row.guests = 0 and v_row.slots_taken = 0, v_row::text);
    select count(*) into v_n from booking_nights where booking_id = v_a;
    res := res || pg_temp.ln('expire: the stale hold still has its nights before expire runs', v_n = 1, v_n::text);
    v_n := expire_stale_holds();
    res := res || pg_temp.ln('expire: expire_stale_holds() returns 1', v_n = 1, v_n::text);
    select status into v_txt from bookings where id = v_a;
    res := res || pg_temp.ln('expire: status is now expired', v_txt = 'expired', v_txt);
    select count(*) into v_n from booking_nights where booking_id = v_a;
    res := res || pg_temp.ln('expire: its nights are freed', v_n = 0, v_n::text);
    v_n := expire_stale_holds();
    res := res || pg_temp.ln('expire: running it again expires nothing', v_n = 0, v_n::text);

    select cb.id into v_b from create_booking(pg_temp.pl(array[t2], '2099-09-20', 1)) cb;
    update bookings set hold_expires_at = now() - interval '1 minute' where id = v_b;
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t2], '2099-09-20', 1));
    res := res || pg_temp.ln('expire: create_booking frees a stale hold by itself and reuses the slot', v_txt = 'ok', v_txt);
    select status into v_txt from bookings where id = v_b;
    res := res || pg_temp.ln('expire: that stale hold was marked expired', v_txt = 'expired', v_txt);

    select cb.id into v_c from create_booking(pg_temp.pl(array[t3], '2099-09-25', 1)) cb;
    update bookings set status = 'payment_review', hold_expires_at = now() - interval '1 hour' where id = v_c;
    v_n := expire_stale_holds();
    select status into v_txt from bookings where id = v_c;
    res := res || pg_temp.ln('expire: payment_review is never expired, even with an old hold time', v_txt = 'payment_review' and v_n = 0, v_txt);
    select is_active(b) into v_row from bookings b where b.id = v_c;
    res := res || pg_temp.ln('is_active: payment_review is active', v_row.is_active, v_row::text);
    update bookings set status = 'cancelled' where id = v_c;
    select is_active(b) into v_row from bookings b where b.id = v_c;
    res := res || pg_temp.ln('is_active: cancelled is not active', not v_row.is_active, v_row::text);

    -- release_booking.
    select cb.id into v_a from create_booking(pg_temp.pl(array[t1], '2099-10-10', 2)) cb;
    v_txt := release_booking(v_a, array['confirmed'], 'cancelled');
    res := res || pg_temp.ln('release: wrong expected status returns null', v_txt is null, v_txt);
    select count(*) into v_n from booking_nights where booking_id = v_a;
    res := res || pg_temp.ln('release: wrong expected status leaves both nights intact', v_n = 2, v_n::text);
    select status into v_txt from bookings where id = v_a;
    res := res || pg_temp.ln('release: wrong expected status leaves the status unchanged', v_txt = 'awaiting_payment', v_txt);
    v_txt := release_booking(v_a, array['awaiting_payment', 'payment_review'], 'cancelled');
    res := res || pg_temp.ln('release: right expected status returns the old status', v_txt = 'awaiting_payment', v_txt);
    select count(*) into v_n from booking_nights where booking_id = v_a;
    res := res || pg_temp.ln('release: the nights are freed', v_n = 0, v_n::text);
    select status into v_txt from bookings where id = v_a;
    res := res || pg_temp.ln('release: the new status is stored', v_txt = 'cancelled', v_txt);
    v_txt := release_booking(v_a, array['awaiting_payment', 'payment_review'], 'cancelled');
    res := res || pg_temp.ln('release: a second release returns null (already handled)', v_txt is null, v_txt);
    v_txt := release_booking(gen_random_uuid(), array['awaiting_payment'], 'cancelled');
    res := res || pg_temp.ln('release: an unknown booking id returns null', v_txt is null, v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-10-10', 2));
    res := res || pg_temp.ln('release: the freed slot can be booked again', v_txt = 'ok', v_txt);

    -- GCash reference uniqueness among active bookings.
    select cb.id into v_a from create_booking(pg_temp.pl(array[t1], '2099-11-10', 1)) cb;
    select cb.id into v_b from create_booking(pg_temp.pl(array[t2], '2099-11-10', 1)) cb;
    select cb.id into v_c from create_booking(pg_temp.pl(array[t3], '2099-11-10', 1)) cb;
    update bookings set status = 'payment_review', gcash_ref = '1234567890123' where id = v_a;
    v_txt := pg_temp.try_sql(format(
      'update bookings set status = ''payment_review'', gcash_ref = ''1234567890123'' where id = %L', v_b));
    res := res || pg_temp.ln('gcash_ref: same ref on a second active booking is refused (23505)', v_txt = '23505', v_txt);
    select status into v_txt from bookings where id = v_b;
    res := res || pg_temp.ln('gcash_ref: the refused booking kept its old status', v_txt = 'awaiting_payment', v_txt);
    v_txt := pg_temp.try_sql(format('update bookings set gcash_ref = %L where id = %L', '9999999999999', v_c));
    res := res || pg_temp.ln('gcash_ref: a different ref is accepted', v_txt = '00000', v_txt);
    update bookings set status = 'cancelled' where id = v_a;
    v_txt := pg_temp.try_sql(format(
      'update bookings set status = ''payment_review'', gcash_ref = ''1234567890123'' where id = %L', v_b));
    res := res || pg_temp.ln('gcash_ref: the ref can be reused once the first booking is cancelled', v_txt = '00000', v_txt);

    -- Guards inside create_booking.
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-02-10', 0, 15, 0, 'day_tour'));
    res := res || pg_temp.ln('guard: day tour with a slot is refused', v_txt = 'day_tour_slots', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(null, '2099-02-10', 0, 15, 0, 'day_tour'));
    res := res || pg_temp.ln('guard: day tour of 15 on a quiet date succeeds (no slot limit)', v_txt = 'ok', v_txt);
    select count(*) into v_n from booking_nights bn join bookings b on b.id = bn.booking_id
      where b.kind = 'day_tour' and b.check_in = '2099-02-10';
    res := res || pg_temp.ln('guard: a day tour creates no booking_nights', v_n = 0, v_n::text);
    v_txt := pg_temp.try_cb(pg_temp.pl(null, '2099-02-11', 1, 2, 0, 'day_tour'));
    res := res || pg_temp.ln('guard: day tour with nights > 0 is refused', v_txt = 'invalid_input', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(null, '2099-02-11', 0, 2, 1, 'day_tour'));
    res := res || pg_temp.ln('guard: day tour with a tent is refused', v_txt = 'invalid_input', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[]::smallint[], '2099-02-12', 1));
    res := res || pg_temp.ln('guard: overnight with no slot is refused', v_txt = 'slots_required', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(null, '2099-02-12', 1));
    res := res || pg_temp.ln('guard: overnight with slot_ids missing is refused', v_txt = 'slots_required', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[32000::smallint], '2099-02-12', 1));
    res := res || pg_temp.ln('guard: unknown slot id is refused', v_txt = 'slot_invalid', v_txt);
    update slots set active = false where id = t4;
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t4], '2099-02-12', 1));
    res := res || pg_temp.ln('guard: inactive slot is refused', v_txt = 'slot_invalid', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t5], '2099-02-12', 1));
    res := res || pg_temp.ln('guard: slot in an inactive camp is refused', v_txt = 'slot_invalid', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-02-12', 1, 11));
    res := res || pg_temp.ln('guard: 11 guests on 1 slot is refused', v_txt = 'slot_capacity', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-02-12', 1, 10));
    res := res || pg_temp.ln('guard: 10 guests on 1 slot succeeds', v_txt = 'ok', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t2, t3], '2099-02-13', 1, 11));
    res := res || pg_temp.ln('guard: 11 guests on 2 slots succeeds', v_txt = 'ok', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1, t1], '2099-02-14', 1, 11));
    res := res || pg_temp.ln('guard: a repeated slot id counts once (11 guests on [T1,T1] refused)', v_txt = 'slot_capacity', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1, t1], '2099-02-14', 1, 5));
    res := res || pg_temp.ln('guard: a repeated slot id does not cause slot_taken', v_txt = 'ok', v_txt);
    select slot_ids = array[t1] into v_ok from bookings where check_in = '2099-02-14';
    res := res || pg_temp.ln('guard: the stored slot_ids are de-duplicated', v_ok);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-02-16', 1, 0));
    res := res || pg_temp.ln('guard: zero guests is refused', v_txt = 'invalid_input', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-02-16', 0));
    res := res || pg_temp.ln('guard: overnight with 0 nights is refused', v_txt = 'invalid_input', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t1], '2099-02-16', 1, 2, 0, 'bogus'));
    res := res || pg_temp.ln('guard: unknown kind is refused', v_txt = 'invalid_input', v_txt);

    raise exception 'rollback_tests';
  exception when others then
    if sqlerrm <> 'rollback_tests' then
      res := res || ('FAIL: the test script stopped on an unexpected error: ' || sqlerrm);
    end if;
  end;

  select count(*) into v_n from unnest(res) as r where r like 'PASS:%';
  res := res || ('SUMMARY: ' || v_n || ' passed, '
    || (select count(*) from unnest(res) as r where r like 'FAIL:%') || ' failed, '
    || (select count(*) from unnest(res) as r where r like 'SKIP:%') || ' skipped');

  return query select r.line from unnest(res) with ordinality as r(line, n) order by r.n;
end;
$$;

select * from pg_temp.run_tests();
