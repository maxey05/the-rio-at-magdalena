import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BookingStatus, StayKind } from "./rules.ts";

export type Camp = {
  id: number;
  name: string;
  description: string;
  sort: number;
  active: boolean;
};

export type Slot = {
  id: number;
  camp_id: number;
  code: string;
  description: string;
  sort: number;
  map_x: number | null;
  map_y: number | null;
  active: boolean;
};

export type SettingsRow = {
  id: true;
  overnight_adult: number;
  overnight_reduced: number;
  day_adult: number;
  day_reduced: number;
  tent_price: number;
  tent_stock: number;
  slot_capacity: number;
  site_cap: number;
  window_days: number;
  max_nights: number;
  hold_minutes: number;
  downpayment_pct: number;
  gcash_name: string | null;
  gcash_number: string | null;
  gcash_qr_path: string | null;
  deposit_note: string;
  contact_phone: string | null;
  contact_email: string | null;
  updated_at: string;
};

export type Booking = {
  id: string;
  ref: string;
  access_token: string;
  kind: StayKind;
  check_in: string;
  nights: number;
  check_out: string;
  guest_name: string;
  email: string;
  mobile: string;
  notes: string;
  adults: number;
  seniors: number;
  kids: number;
  infants: number;
  guests: number;
  tents: number;
  slot_ids: number[];
  adult_rate: number;
  reduced_rate: number;
  tent_rate: number;
  total: number;
  downpayment: number;
  balance: number;
  status: BookingStatus;
  hold_expires_at: string | null;
  gcash_ref: string | null;
  proof_path: string | null;
  proof_submitted_at: string | null;
  decided_at: string | null;
  decided_by: string | null;
  reject_reason: string | null;
  checked_in_at: string | null;
  balance_collected: number | null;
  deposit_amount: number | null;
  deposit_returned: boolean | null;
  cancelled_at: string | null;
  cancelled_by: "guest" | "admin" | null;
  cancel_reason: string | null;
  refund_status: "none" | "due" | "sent";
  refund_ref: string | null;
  refunded_at: string | null;
  created_at: string;
};

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Add it to .env.local (see .env.example).`);
  }
  return value;
}

let client: SupabaseClient | undefined;

export function db(): SupabaseClient {
  client ??= createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const allowed = requireEnv("ADMIN_EMAILS").split(",").map(normalizeEmail).filter(Boolean);
  if (allowed.length === 0) {
    throw new Error("ADMIN_EMAILS has no email addresses. Add the admin email to .env.local (see .env.example).");
  }
  return typeof email === "string" && allowed.includes(normalizeEmail(email));
}

export function serverClient(cookies: CookieMethodsServer): SupabaseClient {
  return createServerClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
    cookies,
  });
}

export async function authClient(): Promise<SupabaseClient> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return serverClient({
    getAll: () => store.getAll(),
    setAll: (list) => {
      try {
        for (const { name, value, options } of list) {
          store.set(name, value, options);
        }
      } catch {
        return;
      }
    },
  });
}

export async function currentAdmin(): Promise<{ email: string } | null> {
  const { data } = await (await authClient()).auth.getUser();
  const { email, email_confirmed_at: confirmedAt } = data.user ?? {};
  return email && confirmedAt && isAdminEmail(email) ? { email } : null;
}

export async function requireAdmin(): Promise<{ email: string }> {
  const admin = await currentAdmin();
  if (admin) {
    return admin;
  }
  const { redirect } = await import("next/navigation");
  return redirect("/admin/login");
}
