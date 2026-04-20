import { trackPageView } from "@/lib/web-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageViewBody = {
  pathname?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PageViewBody;
    const pathname = typeof body.pathname === "string" ? body.pathname.trim() : "";

    if (!pathname || pathname.length > 200 || !pathname.startsWith("/")) {
      return Response.json({ ok: false }, { status: 400 });
    }

    trackPageView(pathname, request);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
