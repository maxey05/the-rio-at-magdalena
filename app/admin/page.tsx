import { requireAdmin } from "@/lib/supabase";

export default async function AdminDashboardPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-2">
      <h1>Dashboard</h1>
      <p className="text-ink-muted">Coming in RFC-015.</p>
    </div>
  );
}
