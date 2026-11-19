import { isCronAuthorized } from "@/lib/cron";
import { db } from "@/lib/supabase";

export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { data, error } = await db().rpc("expire_stale_holds");
  if (error) {
    console.error("expire_stale_holds failed", error.message);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true, expired: data });
}
