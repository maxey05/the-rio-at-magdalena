-- Longest stay is now 30 nights (was 7).
--
-- max_nights lives in the one settings row, so the live row has to be updated;
-- the new default in schema.sql only applies to a fresh database. bookings.nights
-- already allows up to 30. Safe to re-run. Run it once on the live database:
-- Supabase dashboard > SQL Editor > New query > paste > Run.
-- (You can also change it later in admin settings.)

alter table settings alter column max_nights set default 30;

update settings set max_nights = 30 where max_nights <> 30;

notify pgrst, 'reload schema';
