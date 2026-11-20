import { requireAdmin } from "@/lib/supabase";

export default async function AdminInquiriesPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-2">
      <h1>Inquiries</h1>
      <p className="text-ink-muted">Coming in RFC-014.</p>
    </div>
  );
}
