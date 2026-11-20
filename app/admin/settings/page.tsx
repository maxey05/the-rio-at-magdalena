import { requireAdmin } from "@/lib/supabase";

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-2">
      <h1>Settings</h1>
      <p className="text-ink-muted">Coming in RFC-013.</p>
    </div>
  );
}
