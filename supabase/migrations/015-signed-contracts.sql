-- Signed camping agreement upload (booking flow, payment step).
--
-- Safe to re-run: "if not exists" / "on conflict do nothing" everywhere. Run it
-- once on the live database: Supabase dashboard > SQL Editor > New query >
-- paste > Run.
--
-- contract_path is the object path inside the private "signed-contracts"
-- bucket, set together with proof_path when the guest sends payment proof.
-- The bucket is private like payment-proofs: only the server (service_role)
-- uploads, and admins read through short-lived signed URLs.

alter table bookings add column if not exists contract_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signed-contracts', 'signed-contracts', false, 5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
