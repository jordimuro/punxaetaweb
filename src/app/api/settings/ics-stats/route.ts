import { getIcsSubscriptionStats } from "@/lib/calendar-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = getIcsSubscriptionStats();

  return Response.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    stats,
  });
}
