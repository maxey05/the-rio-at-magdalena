-- RFC-014 test script: the inquiries table, its checks, the status update the
-- admin uses, the per-email daily count and the access lock.
--
-- How to run: run schema.sql (or migrations/014-inquiries.sql) first, then
-- paste this WHOLE file into Supabase > SQL Editor > New query > Run. The result
-- is one table of lines; every line should start with PASS, and the last line is
-- the summary ("N passed, 0 failed, 0 skipped").
--
-- Nothing is kept: all test rows are created inside a sub-transaction that is
-- rolled back at the end (sentinel error 'rollback_tests'), so your real
-- inquiries are untouched. The helper functions live in pg_temp and disappear
-- when the session ends. Same form as 011-cancel.sql.
--
-- The app's rules that this script mirrors in plain SQL:
--   1. Status changes are one conditional update that only matches the
--      expected current status (R-14): "where id = ? and status = 'new'".
--   2. The rate limit counts inquiries with the same lowercase email whose
--      created_at is inside today's Manila day: from Manila midnight (inclusive)
--      to the next Manila midnight (exclusive). The app refuses the 4th.

create or replace function pg_temp.ln(p_name text, p_ok boolean, p_got text default null) returns text
language sql
as $$
  select case when coalesce(p_ok, false) then 'PASS: ' || p_name
              else 'FAIL: ' || p_name || coalesce(' (got: ' || p_got || ')', '') end;
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

create or replace function pg_temp.mk(
  p_email text default 'zz-test@example.com',
  p_created timestamptz default now()
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into inquiries (name, mobile, email, type, preferred_date, guests, message, created_at)
  values ('Test Guest', '+639171234567', lower(p_email), 'Prenup shoot', null, 20, 'Hello, we would like a prenup shoot.', p_created)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function pg_temp.set_status(p_id uuid, p_expected text, p_new text) returns int
language plpgsql
as $$
declare
  v_n int;
begin
  update inquiries set status = p_new where id = p_id and status = p_expected;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

create or replace function pg_temp.count_today(p_email text) returns int
language plpgsql
as $$
declare
  v_start timestamptz := (((now() at time zone 'Asia/Manila')::date)::timestamp at time zone 'Asia/Manila');
  v_n int;
begin
  select count(*) into v_n
    from inquiries
   where lower(email) = lower(p_email)
     and created_at >= v_start
     and created_at < v_start + interval '1 day';
  return v_n;
end;
$$;

create or replace function pg_temp.run_tests() returns table (result text)
language plpgsql
as $$
declare
  res text[] := '{}';
  v_id uuid;
  v_row record;
  v_n int;
  v_before int;
  v_after int;
  v_start timestamptz := (((now() at time zone 'Asia/Manila')::date)::timestamp at time zone 'Asia/Manila');
begin
  begin
    res := res || pg_temp.ln('inquiries table exists', to_regclass('public.inquiries') is not null);
    res := res || pg_temp.ln('row level security is on',
      coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.inquiries')), false));
    select count(*) into v_n from pg_policies where schemaname = 'public' and tablename = 'inquiries';
    res := res || pg_temp.ln('no policies exist (anon key reads nothing)', v_n = 0, v_n::text);

    v_id := pg_temp.mk();
    select * into v_row from inquiries where id = v_id;
    res := res || pg_temp.ln('a valid row is saved as new with an empty note and a timestamp',
      v_row.status = 'new' and v_row.admin_note = '' and v_row.created_at is not null,
      concat_ws(' / ', v_row.status, v_row.admin_note, v_row.created_at::text));
    res := res || pg_temp.ln('preferred_date may be null', v_row.preferred_date is null);

    insert into inquiries (name, mobile, email, type, preferred_date, guests, message)
    values ('Test Guest', '+639171234567', 'zz-date@example.com', 'Intimate event', date '2099-03-01', 300, 'Intimate event with everyone.')
    returning id into v_id;
    res := res || pg_temp.ln('a preferred date and 300 guests are accepted', v_id is not null);

    res := res || pg_temp.ln('type outside the list is refused',
      pg_temp.try_sql($q$insert into inquiries (name, mobile, email, type, guests, message) values ('Test Guest','+639171234567','zz@example.com','Wedding',10,'Hello, this is long enough.')$q$) = '23514');
    res := res || pg_temp.ln('guests = 0 is refused',
      pg_temp.try_sql($q$insert into inquiries (name, mobile, email, type, guests, message) values ('Test Guest','+639171234567','zz@example.com','Other',0,'Hello, this is long enough.')$q$) = '23514');
    res := res || pg_temp.ln('guests = 301 is refused',
      pg_temp.try_sql($q$insert into inquiries (name, mobile, email, type, guests, message) values ('Test Guest','+639171234567','zz@example.com','Other',301,'Hello, this is long enough.')$q$) = '23514');
    res := res || pg_temp.ln('a 9 character message is refused',
      pg_temp.try_sql($q$insert into inquiries (name, mobile, email, type, guests, message) values ('Test Guest','+639171234567','zz@example.com','Other',10,'123456789')$q$) = '23514');
    res := res || pg_temp.ln('a 1001 character message is refused',
      pg_temp.try_sql('insert into inquiries (name, mobile, email, type, guests, message) values (''Test Guest'',''+639171234567'',''zz@example.com'',''Other'',10,' || quote_literal(repeat('x', 1001)) || ')') = '23514');
    res := res || pg_temp.ln('a 1000 character message is accepted',
      pg_temp.try_sql('insert into inquiries (name, mobile, email, type, guests, message) values (''Test Guest'',''+639171234567'',''zz@example.com'',''Other'',10,' || quote_literal(repeat('x', 1000)) || ')') = '00000');
    res := res || pg_temp.ln('a 1 character name is refused',
      pg_temp.try_sql($q$insert into inquiries (name, mobile, email, type, guests, message) values ('A','+639171234567','zz@example.com','Other',10,'Hello, this is long enough.')$q$) = '23514');
    res := res || pg_temp.ln('a missing email is refused',
      pg_temp.try_sql($q$insert into inquiries (name, mobile, type, guests, message) values ('Test Guest','+639171234567','Other',10,'Hello, this is long enough.')$q$) = '23502');
    res := res || pg_temp.ln('an unknown status is refused',
      pg_temp.try_sql($q$insert into inquiries (name, mobile, email, type, guests, message, status) values ('Test Guest','+639171234567','zz@example.com','Other',10,'Hello, this is long enough.','archived')$q$) = '23514');
    res := res || pg_temp.ln('an admin note over 1000 characters is refused',
      pg_temp.try_sql('insert into inquiries (name, mobile, email, type, guests, message, admin_note) values (''Test Guest'',''+639171234567'',''zz@example.com'',''Other'',10,''Hello, this is long enough.'',' || quote_literal(repeat('x', 1001)) || ')') = '23514');

    v_id := pg_temp.mk('zz-status@example.com');
    res := res || pg_temp.ln('new -> replied changes 1 row', pg_temp.set_status(v_id, 'new', 'replied') = 1);
    res := res || pg_temp.ln('a second new -> replied changes 0 rows (already handled)', pg_temp.set_status(v_id, 'new', 'replied') = 0);
    res := res || pg_temp.ln('replied -> closed changes 1 row', pg_temp.set_status(v_id, 'replied', 'closed') = 1);
    res := res || pg_temp.ln('closed -> new (reopen) changes 1 row', pg_temp.set_status(v_id, 'closed', 'new') = 1);
    update inquiries set admin_note = 'Called, quoted 15k.' where id = v_id;
    select * into v_row from inquiries where id = v_id;
    res := res || pg_temp.ln('the admin note is saved and the status is new again',
      v_row.admin_note = 'Called, quoted 15k.' and v_row.status = 'new', concat_ws(' / ', v_row.admin_note, v_row.status));

    perform pg_temp.mk('Zz-Limit@Example.com');
    perform pg_temp.mk('zz-limit@example.com');
    perform pg_temp.mk('ZZ-LIMIT@example.com');
    res := res || pg_temp.ln('3 inquiries today are counted for one email, ignoring case',
      pg_temp.count_today('zz-LIMIT@example.com') = 3, pg_temp.count_today('zz-LIMIT@example.com')::text);
    res := res || pg_temp.ln('another email has its own count', pg_temp.count_today('zz-other@example.com') = 0);

    perform pg_temp.mk('zz-edge@example.com', v_start - interval '1 second');
    perform pg_temp.mk('zz-edge@example.com', v_start + interval '1 day');
    res := res || pg_temp.ln('one second before Manila midnight and the next midnight are not today',
      pg_temp.count_today('zz-edge@example.com') = 0, pg_temp.count_today('zz-edge@example.com')::text);
    perform pg_temp.mk('zz-edge@example.com', v_start);
    perform pg_temp.mk('zz-edge@example.com', v_start + interval '1 day' - interval '1 second');
    res := res || pg_temp.ln('Manila midnight and the last second of the day are today',
      pg_temp.count_today('zz-edge@example.com') = 2, pg_temp.count_today('zz-edge@example.com')::text);

    select count(*) into v_before from booking_nights;
    perform pg_temp.mk('zz-nights@example.com');
    select count(*) into v_after from booking_nights;
    res := res || pg_temp.ln('an inquiry adds no booking_nights (never blocks a date)', v_before = v_after);

    if exists (select 1 from pg_roles where rolname = 'anon') then
      res := res || pg_temp.ln('security: anon cannot read inquiries', not has_table_privilege('anon', 'inquiries', 'select'));
      res := res || pg_temp.ln('security: anon cannot insert inquiries', not has_table_privilege('anon', 'inquiries', 'insert'));
    else
      res := res || 'SKIP: anon role not found (not a Supabase database), anon grants not checked';
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      res := res || pg_temp.ln('security: authenticated cannot read inquiries', not has_table_privilege('authenticated', 'inquiries', 'select'));
      res := res || pg_temp.ln('security: authenticated cannot update inquiries', not has_table_privilege('authenticated', 'inquiries', 'update'));
    else
      res := res || 'SKIP: authenticated role not found (not a Supabase database), authenticated grants not checked';
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      res := res || pg_temp.ln('security: service_role can read inquiries', has_table_privilege('service_role', 'inquiries', 'select'));
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
