export default async function handler(): Promise<Response> {
  const siteUrl = process.env.SITE_URL;
  const secret = process.env.CRON_SECRET;
  if (!siteUrl || !secret) {
    console.error("cron-expire-holds: SITE_URL or CRON_SECRET is not set");
    return new Response("Misconfigured", { status: 500 });
  }
  const response = await fetch(`${siteUrl}/api/cron/expire-holds`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  console.log(`cron-expire-holds: ${response.status} ${await response.text()}`);
  return new Response(null, { status: response.ok ? 200 : 500 });
}
