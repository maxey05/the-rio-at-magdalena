-- RFC-011 test script: cancellations, refund flags and the GCash reference index.
--
-- How to run: run schema.sql first (seed.sql is optional, this script does not
-- need it), then paste this WHOLE file into Supabase > SQL Editor > New query >
-- Run. The result is one table of lines; every line should start with PASS, and
-- the last line is the summary ("N passed, 0 failed, 0 skipped").
--
-- Nothing is kept: all test data is created inside a sub-transaction that is
-- rolled back at the end (sentinel error 'rollback_tests'), so your real
-- tables are untouched. The helper functions live in pg_temp and disappear
-- when the session ends. Same form as 004-booking-functions.sql: the SQL
-- editor only shows the last result set, so a plain BEGIN ... ROLLBACK script
-- could not show its own PASS/FAIL lines. The helpers pl, try_cb, try_sql, ln
-- and run_tests are identical to the ones in 004, so running 004 and 011 in the
-- same session is harmless.
--
-- Test dates are in the year 2099 so they never meet real bookings. The tests
-- set site_cap = 50 and tent_stock = 2 INSIDE the rolled-back transaction.
--
-- The app cancels a booking in two steps (lib/cancellations.ts):
--   1. release_booking(id, ['awaiting_payment','payment_review','confirmed'],
--      'cancelled') returns the PREVIOUS status, or null if the booking was not
--      in one of those statuses (already handled);
--   2. only if step 1 returned a status: set cancelled_at, cancelled_by,
--      cancel_reason and refund_status ('due' if the previous status was
--      payment_review or confirmed, otherwise 'none').
-- Recording a refund is one conditional update that only matches refund_status
-- 'due'. pg_temp.cancel_bk and pg_temp.refund_bk below copy those statements in
-- plain SQL, so these tests check the SQL rules the app relies on.
--
-- Booking states that create_booking cannot produce (payment_review, confirmed,
-- checked_in, ...) are made the way 004 does it: create the booking with
-- create_booking (so it really holds its nights), then update its status.

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

-- Creates a booking with create_booking, then moves it to p_status.
create or replace function pg_temp.mk(p jsonb, p_status text default 'awaiting_payment') returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  select cb.id into v_id from create_booking(p) cb;
  if p_status <> 'awaiting_payment' then
    update bookings set status = p_status where id = v_id;
  end if;
  return v_id;
end;
$$;

-- Mirror of the cancel in the app (guest or admin). Returns what step 1 returned.
create or replace function pg_temp.cancel_bk(p_id uuid, p_by text, p_reason text) returns text
language plpgsql
as $$
declare
  v_prev text;
begin
  v_prev := release_booking(p_id, array['awaiting_payment', 'payment_review', 'confirmed'], 'cancelled');
  if v_prev is not null then
    update bookings
       set cancelled_at = now(),
           cancelled_by = p_by,
           cancel_reason = p_reason,
           refund_status = case when v_prev in ('payment_review', 'confirmed') then 'due' else 'none' end
     where id = p_id and status = 'cancelled';
  end if;
  return v_prev;
end;
$$;

-- Mirror of recordRefund in the app. Returns the number of rows changed.
create or replace function pg_temp.refund_bk(p_id uuid, p_ref text) returns int
language plpgsql
as $$
declare
  v_n int;
begin
  update bookings
     set refund_status = 'sent', refund_ref = p_ref, refunded_at = now()
   where id = p_id and refund_status = 'due';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

create or replace function pg_temp.run_tests() returns table (result text)
language plpgsql
as $$
declare
  res text[] := '{}';
  v_camp smallint;
  t1 smallint;
  t2 smallint;
  t3 smallint;
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_txt text;
  v_n int;
  v_row record;
  v_d date;
  v_k int;
  v_st text;
  v_by text;
  v_rsn text;
  v_lbl text;
  v_j1 jsonb;
  v_j2 jsonb;
begin
  begin
    -- Test data (rolled back at the end): a test camp with 3 slots.
    insert into settings (id) values (true) on conflict (id) do nothing;
    update settings set site_cap = 50, tent_stock = 2, slot_capacity = 10, hold_minutes = 30 where id;
    insert into camps (name, active) values ('zz test camp', true) returning id into v_camp;
    insert into slots (camp_id, code) values (v_camp, 'T1') returning id into t1;
    insert into slots (camp_id, code) values (v_camp, 'T2') returning id into t2;
    insert into slots (camp_id, code) values (v_camp, 'T3') returning id into t3;

    -- Every active status x who cancels. payment_review and confirmed bookings
    -- are given an old hold_expires_at, like real ones (the hold time only
    -- matters while awaiting_payment); the cancel must not care.
    v_k := 0;
    foreach v_st in array array['awaiting_payment', 'payment_review', 'confirmed'] loop
      foreach v_by in array array['guest', 'admin'] loop
        v_d := date '2099-05-01' + v_k * 3;
        v_k := v_k + 1;
        v_lbl := v_st || ' cancelled by ' || v_by || ': ';
        v_rsn := case when v_by = 'admin' then 'Closed for bad weather' else null end;
        v_a := pg_temp.mk(pg_temp.pl(array[t1], v_d, 2), v_st);
        if v_st <> 'awaiting_payment' then
          update bookings set hold_expires_at = now() - interval '2 hours' where id = v_a;
        end if;
        select count(*) into v_n from booking_nights where booking_id = v_a;
        res := res || pg_temp.ln(v_lbl || 'it holds its 2 nights before the cancel', v_n = 2, v_n::text);
        v_txt := pg_temp.cancel_bk(v_a, v_by, v_rsn);
        res := res || pg_temp.ln(v_lbl || 'release_booking returns the previous status', v_txt = v_st, v_txt);
        select * into v_row from bookings where id = v_a;
        res := res || pg_temp.ln(v_lbl || 'status is cancelled', v_row.status = 'cancelled', v_row.status);
        select count(*) into v_n from booking_nights where booking_id = v_a;
        res := res || pg_temp.ln(v_lbl || 'its nights are deleted', v_n = 0, v_n::text);
        res := res || pg_temp.ln(v_lbl || 'refund_status is ' || case when v_st = 'awaiting_payment' then 'none' else 'due' end,
          v_row.refund_status = case when v_st = 'awaiting_payment' then 'none' else 'due' end, v_row.refund_status);
        res := res || pg_temp.ln(v_lbl || 'cancelled_by and cancel_reason are stored and cancelled_at is set',
          v_row.cancelled_by = v_by and v_row.cancel_reason is not distinct from v_rsn and v_row.cancelled_at is not null,
          concat_ws(' / ', v_row.cancelled_by, v_row.cancel_reason, v_row.cancelled_at::text));
        res := res || pg_temp.ln(v_lbl || 'nothing is marked as refunded yet',
          v_row.refund_ref is null and v_row.refunded_at is null, concat_ws(' / ', v_row.refund_ref, v_row.refunded_at::text));
      end loop;
    end loop;

    -- Freed slots are bookable again at once; before the cancel they are not.
    v_a := pg_temp.mk(pg_temp.pl(array[t2], '2099-06-10', 2));
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t2], '2099-06-10', 2));
    res := res || pg_temp.ln('rebook: before the cancel the same slot and nights are refused (awaiting_payment)', v_txt = 'slot_taken', v_txt);
    v_txt := pg_temp.cancel_bk(v_a, 'guest', null);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t2], '2099-06-10', 2));
    res := res || pg_temp.ln('rebook: right after the cancel the same slot and nights are accepted', v_txt = 'ok', v_txt);
    select count(*) into v_n from booking_nights where slot_id = t2 and night between '2099-06-10' and '2099-06-11';
    res := res || pg_temp.ln('rebook: the new booking holds both nights', v_n = 2, v_n::text);
    select count(*) into v_n from booking_nights where booking_id = v_a;
    res := res || pg_temp.ln('rebook: the cancelled booking has no nights', v_n = 0, v_n::text);

    v_b := pg_temp.mk(pg_temp.pl(array[t3], '2099-06-20', 2), 'confirmed');
    update bookings set hold_expires_at = now() - interval '2 hours' where id = v_b;
    select o.guests, o.slots_taken into v_row from occupancy_between('2099-06-20', '2099-06-20') o;
    res := res || pg_temp.ln('rebook: a confirmed booking counts 2 guests and 1 slot on Jun 20', v_row.guests = 2 and v_row.slots_taken = 1, v_row::text);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t3], '2099-06-21', 2));
    res := res || pg_temp.ln('rebook: before the cancel an overlapping stay is refused (confirmed)', v_txt = 'slot_taken', v_txt);
    v_txt := pg_temp.cancel_bk(v_b, 'admin', 'Closed for bad weather');
    res := res || pg_temp.ln('rebook: admin cancel of the confirmed booking returns confirmed', v_txt = 'confirmed', v_txt);
    select o.guests, o.slots_taken into v_row from occupancy_between('2099-06-20', '2099-06-20') o;
    res := res || pg_temp.ln('rebook: after the cancel Jun 20 shows 0 guests and 0 slots', v_row.guests = 0 and v_row.slots_taken = 0, v_row::text);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t3], '2099-06-21', 2));
    res := res || pg_temp.ln('rebook: after the cancel the overlapping stay is accepted', v_txt = 'ok', v_txt);
    v_txt := pg_temp.try_cb(pg_temp.pl(array[t3], '2099-06-20', 1));
    res := res || pg_temp.ln('rebook: the first freed night on its own is accepted too', v_txt = 'ok', v_txt);

    -- Double click: the second release finds the booking already cancelled.
    v_a := pg_temp.mk(pg_temp.pl(array[t1], '2099-07-10', 2), 'confirmed');
    v_txt := pg_temp.cancel_bk(v_a, 'guest', null);
    res := res || pg_temp.ln('double click: the first click returns confirmed', v_txt = 'confirmed', v_txt);
    select to_jsonb(b) into v_j1 from bookings b where b.id = v_a;
    v_txt := pg_temp.cancel_bk(v_a, 'admin', 'second click');
    res := res || pg_temp.ln('double click: the second click returns null (already handled)', v_txt is null, v_txt);
    select to_jsonb(b) into v_j2 from bookings b where b.id = v_a;
    res := res || pg_temp.ln('double click: the booking row is exactly as the first click left it', v_j1 = v_j2, v_j2::text);
    select * into v_row from bookings where id = v_a;
    res := res || pg_temp.ln('double click: still cancelled by guest, no reason, refund due',
      v_row.status = 'cancelled' and v_row.cancelled_by = 'guest' and v_row.cancel_reason is null and v_row.refund_status = 'due', v_row.status);
    v_txt := release_booking(v_a, array['awaiting_payment', 'payment_review', 'confirmed'], 'cancelled');
    res := res || pg_temp.ln('double click: release_booking itself returns null the second time', v_txt is null, v_txt);

    -- Statuses that must never be cancelled: release_booking returns null and
    -- the row is untouched. (The nights are left in place on purpose, to prove
    -- that a refused release does not delete them.)
    v_k := 0;
    foreach v_st in array array['checked_in', 'completed', 'rejected', 'expired', 'no_show'] loop
      v_d := date '2099-08-01' + v_k * 3;
      v_k := v_k + 1;
      v_lbl := v_st || ': ';
      v_a := pg_temp.mk(pg_temp.pl(array[t1], v_d, 2), v_st);
      select to_jsonb(b) into v_j1 from bookings b where b.id = v_a;
      v_txt := pg_temp.cancel_bk(v_a, 'admin', 'Closed for bad weather');
      res := res || pg_temp.ln(v_lbl || 'release_booking returns null', v_txt is null, v_txt);
      select to_jsonb(b) into v_j2 from bookings b where b.id = v_a;
      res := res || pg_temp.ln(v_lbl || 'the row is untouched (same status, no cancel fields, no refund flag)', v_j1 = v_j2, v_j2::text);
      select count(*) into v_n from booking_nights where booking_id = v_a;
      res := res || pg_temp.ln(v_lbl || 'its nights are untouched', v_n = 2, v_n::text);
    end loop;

    -- Refund recording.
    v_a := pg_temp.mk(pg_temp.pl(array[t1], '2099-09-10', 1), 'confirmed');
    v_txt := pg_temp.cancel_bk(v_a, 'guest', null);
    select refund_status into v_txt from bookings where id = v_a;
    res := res || pg_temp.ln('refund: a cancelled confirmed booking starts as due', v_txt = 'due', v_txt);
    v_n := pg_temp.refund_bk(v_a, '1234567890123');
    res := res || pg_temp.ln('refund: the first record changes 1 row', v_n = 1, v_n::text);
    select * into v_row from bookings where id = v_a;
    res := res || pg_temp.ln('refund: refund_status is now sent', v_row.refund_status = 'sent', v_row.refund_status);
    res := res || pg_temp.ln('refund: the ref is stored', v_row.refund_ref = '1234567890123', v_row.refund_ref);
    res := res || pg_temp.ln('refund: refunded_at is set', v_row.refunded_at is not null, v_row.refunded_at::text);
    res := res || pg_temp.ln('refund: the booking is still cancelled', v_row.status = 'cancelled', v_row.status);
    v_n := pg_temp.refund_bk(v_a, '9999999999999');
    res := res || pg_temp.ln('refund: the second record changes 0 rows', v_n = 0, v_n::text);
    select refund_ref into v_txt from bookings where id = v_a;
    res := res || pg_temp.ln('refund: the second record did not overwrite the ref', v_txt = '1234567890123', v_txt);

    v_b := pg_temp.mk(pg_temp.pl(array[t2], '2099-09-10', 1));
    v_txt := pg_temp.cancel_bk(v_b, 'guest', null);
    v_n := pg_temp.refund_bk(v_b, '1234567890123');
    res := res || pg_temp.ln('refund: recording on a refund_status none booking changes 0 rows', v_n = 0, v_n::text);
    select * into v_row from bookings where id = v_b;
    res := res || pg_temp.ln('refund: that booking stays none with no ref and no timestamp',
      v_row.refund_status = 'none' and v_row.refund_ref is null and v_row.refunded_at is null, v_row.refund_status);

    v_c := pg_temp.mk(pg_temp.pl(array[t3], '2099-09-10', 1), 'confirmed');
    v_n := pg_temp.refund_bk(v_c, '1234567890123');
    res := res || pg_temp.ln('refund: recording on a booking that was never cancelled changes 0 rows', v_n = 0, v_n::text);
    select * into v_row from bookings where id = v_c;
    res := res || pg_temp.ln('refund: that confirmed booking is unchanged', v_row.status = 'confirmed' and v_row.refund_status = 'none', v_row.status);

    v_txt := pg_temp.try_sql(format('update bookings set cancelled_by = %L where id = %L', 'system', v_a));
    res := res || pg_temp.ln('check: cancelled_by accepts only guest or admin (23514)', v_txt = '23514', v_txt);
    v_txt := pg_temp.try_sql(format('update bookings set refund_status = %L where id = %L', 'paid', v_a));
    res := res || pg_temp.ln('check: refund_status accepts only none, due or sent (23514)', v_txt = '23514', v_txt);

    -- GCash reference index: a cancelled booking releases its reference.
    v_a := pg_temp.mk(pg_temp.pl(array[t1], '2099-10-10', 1), 'payment_review');
    update bookings set gcash_ref = '1234567890123' where id = v_a;
    v_b := pg_temp.mk(pg_temp.pl(array[t2], '2099-10-10', 1));
    v_c := pg_temp.mk(pg_temp.pl(array[t3], '2099-10-10', 1));
    v_txt := pg_temp.try_sql(format(
      'update bookings set status = ''payment_review'', gcash_ref = ''1234567890123'' where id = %L', v_b));
    res := res || pg_temp.ln('gcash_ref: two live bookings cannot share a reference (23505)', v_txt = '23505', v_txt);
    v_txt := pg_temp.cancel_bk(v_a, 'guest', null);
    res := res || pg_temp.ln('gcash_ref: cancelling the payment_review booking returns payment_review', v_txt = 'payment_review', v_txt);
    select gcash_ref into v_txt from bookings where id = v_a;
    res := res || pg_temp.ln('gcash_ref: the cancelled booking keeps its reference for the record', v_txt = '1234567890123', v_txt);
    v_txt := pg_temp.try_sql(format(
      'update bookings set status = ''payment_review'', gcash_ref = ''1234567890123'' where id = %L', v_b));
    res := res || pg_temp.ln('gcash_ref: a new booking can use the cancelled booking''s reference', v_txt = '00000', v_txt);
    v_txt := pg_temp.try_sql(format(
      'update bookings set status = ''payment_review'', gcash_ref = ''1234567890123'' where id = %L', v_c));
    res := res || pg_temp.ln('gcash_ref: once reused, a third live booking is refused again (23505)', v_txt = '23505', v_txt);
    v_n := pg_temp.refund_bk(v_a, '1111111111111');
    res := res || pg_temp.ln('gcash_ref: the refund on the cancelled booking can still be recorded', v_n = 1, v_n::text);

    -- Day tours have no booking_nights and cancel cleanly.
    v_a := pg_temp.mk(pg_temp.pl(null, '2099-11-10', 0, 4, 0, 'day_tour'), 'confirmed');
    v_b := pg_temp.mk(pg_temp.pl(null, '2099-11-11', 0, 3, 0, 'day_tour'));
    select count(*) into v_n from booking_nights where booking_id in (v_a, v_b);
    res := res || pg_temp.ln('day tour: it has no booking_nights before the cancel', v_n = 0, v_n::text);
    select o.guests into v_n from occupancy_between('2099-11-10', '2099-11-10') o;
    res := res || pg_temp.ln('day tour: it counts 4 guests on Nov 10 before the cancel', v_n = 4, v_n::text);
    v_txt := pg_temp.cancel_bk(v_a, 'guest', null);
    res := res || pg_temp.ln('day tour: cancelling a confirmed one returns confirmed', v_txt = 'confirmed', v_txt);
    select * into v_row from bookings where id = v_a;
    res := res || pg_temp.ln('day tour: confirmed one is cancelled by guest with refund due',
      v_row.status = 'cancelled' and v_row.cancelled_by = 'guest' and v_row.refund_status = 'due', v_row.status);
    select o.guests into v_n from occupancy_between('2099-11-10', '2099-11-10') o;
    res := res || pg_temp.ln('day tour: Nov 10 shows 0 guests after the cancel', v_n = 0, v_n::text);
    v_txt := pg_temp.cancel_bk(v_b, 'admin', 'Closed for bad weather');
    res := res || pg_temp.ln('day tour: cancelling an awaiting_payment one returns awaiting_payment', v_txt = 'awaiting_payment', v_txt);
    select * into v_row from bookings where id = v_b;
    res := res || pg_temp.ln('day tour: awaiting_payment one is cancelled by admin with no refund',
      v_row.status = 'cancelled' and v_row.cancelled_by = 'admin' and v_row.refund_status = 'none', v_row.status);
    v_txt := pg_temp.cancel_bk(v_a, 'admin', 'again');
    res := res || pg_temp.ln('day tour: a second cancel returns null', v_txt is null, v_txt);

    -- email_log accepts the three kinds RFC-011 sends.
    foreach v_st in array array['cancelled', 'refund_sent', 'admin_guest_cancelled'] loop
      v_txt := pg_temp.try_sql(format(
        'insert into email_log (kind, booking_id, recipient, subject, body, status) values (%L, %L, %L, %L, %L, %L)',
        v_st, v_a, 'test@example.com', 'test', 'test', 'sent'));
      res := res || pg_temp.ln('email_log: kind ' || v_st || ' is accepted', v_txt = '00000', v_txt);
    end loop;

    -- Privileges: only the server (service_role) may cancel or touch bookings.
    if exists (select 1 from pg_roles where rolname = 'anon') then
      res := res || pg_temp.ln('security: anon cannot run release_booking',
        not has_function_privilege('anon', 'release_booking(uuid, text[], text)', 'execute'));
      res := res || pg_temp.ln('security: anon cannot update bookings (refund fields)',
        not has_table_privilege('anon', 'bookings', 'update'));
    else
      res := res || 'SKIP: anon role not found (not a Supabase database), anon grants not checked';
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      res := res || pg_temp.ln('security: authenticated cannot run release_booking',
        not has_function_privilege('authenticated', 'release_booking(uuid, text[], text)', 'execute'));
      res := res || pg_temp.ln('security: authenticated cannot update bookings (refund fields)',
        not has_table_privilege('authenticated', 'bookings', 'update'));
      res := res || pg_temp.ln('security: authenticated cannot read bookings',
        not has_table_privilege('authenticated', 'bookings', 'select'));
    else
      res := res || 'SKIP: authenticated role not found (not a Supabase database), authenticated grants not checked';
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      res := res || pg_temp.ln('security: service_role can run release_booking',
        has_function_privilege('service_role', 'release_booking(uuid, text[], text)', 'execute'));
    end if;

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
