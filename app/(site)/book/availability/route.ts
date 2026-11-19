import { getAvailability } from "@/lib/availability";
import type { StayKind } from "@/lib/rules";

function parseKind(value: string | null): StayKind | null {
  return value === "overnight" || value === "day_tour" ? value : null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = parseKind(params.get("type"));
  if (!kind) {
    return Response.json({ error: "Unknown stay type." }, { status: 400 });
  }
  const checkIn = params.get("in");
  const nights = Number(params.get("n"));
  const stay = checkIn && Number.isInteger(nights) ? { checkIn, nights } : null;
  try {
    return Response.json(await getAvailability(kind, stay), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("availability failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "Availability is not available right now." }, { status: 503 });
  }
}
