import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin-sidebar";
import { currentAdmin, db } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

async function paymentsWaiting(): Promise<number | null> {
  const { count, error } = await db()
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "payment_review");
  return error ? null : count;
}

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await currentAdmin();

  if (!admin) {
    return <div className="admin">{children}</div>;
  }

  return (
    <div className="admin lg:flex">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-surface px-5 py-3 text-small font-bold text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <AdminSidebar paymentsWaiting={await paymentsWaiting()} />
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-4 outline-none md:p-8">
        {children}
      </main>
    </div>
  );
}
