import { redirect } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { currentAdmin } from "@/lib/supabase";
import { LoginForm } from "./login-form";

export default async function AdminLoginPage() {
  if (await currentAdmin()) {
    redirect("/admin");
  }

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-4 py-12">
      <div className="text-forest">
        <Wordmark />
      </div>
      <div className="flex flex-col gap-6 rounded-card border border-line bg-surface p-6">
        <h1>Admin sign in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
