import { getIcsSubscriptionStats } from "@/lib/calendar-subscriptions";
import { listRoutes } from "@/lib/routes";
import { getWebAnalyticsStats } from "@/lib/web-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [analytics, routes, ics] = await Promise.all([
    Promise.resolve(getWebAnalyticsStats()),
    listRoutes(),
    Promise.resolve(getIcsSubscriptionStats()),
  ]);

  const routeNameBySlug = new Map(routes.map((route) => [route.slug, route.name]));

  return Response.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    analytics: {
      ...analytics,
      topRoutes: analytics.topRoutes.map((item) => ({
        slug: item.slug,
        name: routeNameBySlug.get(item.slug) ?? item.slug,
        views: item.views,
      })),
    },
    ics,
  });
}
