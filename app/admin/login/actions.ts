"use server";

import { redirect } from "next/navigation";
import { authClient, isAdminEmail } from "@/lib/supabase";

export type LoginState = { error: string | null; email: string };

const WRONG_CREDENTIALS = "Email or password is incorrect";

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().slice(0, 254);
  const password = String(formData.get("password") ?? "").slice(0, 128);
  const failed = { error: WRONG_CREDENTIALS, email };

  if (!email || !password) {
    return failed;
  }

  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return failed;
  }

  let admin = false;
  try {
    admin = Boolean(data.user.email_confirmed_at) && isAdminEmail(data.user.email);
  } finally {
    if (!admin) {
      await supabase.auth.signOut({ scope: "local" });
    }
  }
  if (!admin) {
    return failed;
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/admin/login");
}
