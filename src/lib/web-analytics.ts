import "server-only";

import { createHash } from "node:crypto";
import type { Statement } from "better-sqlite3";
import { db } from "@/lib/database";

const LAST_30_DAYS_SECONDS = 30 * 24 * 60 * 60;
const DEDUPE_WINDOW_SECONDS = 30 * 60;

type DashboardSummaryRow = {
  totalViews: number;
  viewsLast30d: number;
  uniqueVisitorsLast30d: number;
  routeViewsTotal: number;
  routeViewsLast30d: number;
  lastTrackedAt: number | null;
};

type PageType =
  | "home"
  | "routes-list"
  | "route-detail"
  | "routes-calendar-subscription"
  | "photos"
  | "trofeu-list"
  | "trofeu-detail"
  | "equipacions-list"
  | "equipacions-detail"
  | "contact"
  | "other"
  | "admin";

type PageClassification = {
  pageType: PageType;
  pageKey: string;
  slug: string | null;
};

type AnalyticsStatements = {
  findRecentViewStatement: Statement;
  insertViewStatement: Statement;
  getSummaryStatement: Statement;
  getTopRoutesStatement: Statement;
  getTopPagesStatement: Statement;
};

const emptyAnalytics = {
  summary: {
    totalViews: 0,
    viewsLast30d: 0,
    uniqueVisitorsLast30d: 0,
    routeViewsTotal: 0,
    routeViewsLast30d: 0,
    lastTrackedAt: null as string | null,
  },
  topRoutes: [] as Array<{ slug: string; views: number }>,
  topPages: [] as Array<{ pageKey: string; pageType: PageType; views: number }>,
};

let schemaReady = false;
let statements: AnalyticsStatements | null = null;

function ensureSchema() {
  if (schemaReady) {
    return true;
  }

  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS page_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_key TEXT NOT NULL,
        page_type TEXT NOT NULL,
        slug TEXT,
        visitor_hash TEXT NOT NULL,
        user_agent TEXT,
        viewed_at INTEGER NOT NULL
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at
      ON page_views(viewed_at)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_page_views_page_type_viewed_at
      ON page_views(page_type, viewed_at)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_page_views_page_key_viewed_at
      ON page_views(page_key, viewed_at)
    `).run();

    statements = {
      findRecentViewStatement: db.prepare(`
        SELECT id
        FROM page_views
        WHERE visitor_hash = ? AND page_key = ? AND viewed_at >= ?
        LIMIT 1
      `),
      insertViewStatement: db.prepare(`
        INSERT INTO page_views (
          page_key,
          page_type,
          slug,
          visitor_hash,
          user_agent,
          viewed_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `),
      getSummaryStatement: db.prepare(`
        SELECT
          COUNT(*) AS totalViews,
          COUNT(CASE WHEN viewed_at >= ? THEN 1 END) AS viewsLast30d,
          COUNT(DISTINCT CASE WHEN viewed_at >= ? THEN visitor_hash END) AS uniqueVisitorsLast30d,
          COUNT(CASE WHEN page_type = 'route-detail' THEN 1 END) AS routeViewsTotal,
          COUNT(CASE WHEN page_type = 'route-detail' AND viewed_at >= ? THEN 1 END) AS routeViewsLast30d,
          MAX(viewed_at) AS lastTrackedAt
        FROM page_views
      `),
      getTopRoutesStatement: db.prepare(`
        SELECT slug, COUNT(*) AS views
        FROM page_views
        WHERE page_type = 'route-detail' AND viewed_at >= ? AND slug IS NOT NULL
        GROUP BY slug
        ORDER BY views DESC
        LIMIT 5
      `),
      getTopPagesStatement: db.prepare(`
        SELECT page_key AS pageKey, page_type AS pageType, COUNT(*) AS views
        FROM page_views
        WHERE viewed_at >= ?
        GROUP BY page_key, page_type
        ORDER BY views DESC
        LIMIT 8
      `),
    };

    schemaReady = true;
    return true;
  } catch {
    return false;
  }
}

function normalizePathname(pathname: string) {
  const trimmed = pathname.trim();
  if (!trimmed) {
    return "/";
  }

  const withoutQuery = trimmed.split("?")[0] ?? "/";
  const normalized = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;

  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function classifyPathname(pathnameRaw: string): PageClassification {
  const pathname = normalizePathname(pathnameRaw);

  if (pathname === "/") {
    return { pageType: "home", pageKey: pathname, slug: null };
  }

  if (pathname === "/rutas") {
    return { pageType: "routes-list", pageKey: pathname, slug: null };
  }

  if (pathname === "/rutas/calendari") {
    return { pageType: "routes-calendar-subscription", pageKey: pathname, slug: null };
  }

  if (pathname.startsWith("/rutas/")) {
    const routeSlug = pathname.slice("/rutas/".length);
    if (!routeSlug || routeSlug.includes("/") || routeSlug === "nova" || routeSlug.endsWith("/editar")) {
      return { pageType: "other", pageKey: pathname, slug: null };
    }

    return { pageType: "route-detail", pageKey: pathname, slug: routeSlug };
  }

  if (pathname === "/publicacions") {
    return { pageType: "photos", pageKey: pathname, slug: null };
  }

  if (pathname === "/carrera-ciclista") {
    return { pageType: "trofeu-list", pageKey: pathname, slug: null };
  }

  if (pathname.startsWith("/carrera-ciclista/")) {
    const slug = pathname.slice("/carrera-ciclista/".length);
    if (!slug || slug.includes("/") || slug === "nova" || slug.endsWith("/editar")) {
      return { pageType: "other", pageKey: pathname, slug: null };
    }
    return { pageType: "trofeu-detail", pageKey: pathname, slug };
  }

  if (pathname === "/equipaciones") {
    return { pageType: "equipacions-list", pageKey: pathname, slug: null };
  }

  if (pathname.startsWith("/equipaciones/")) {
    const slug = pathname.slice("/equipaciones/".length);
    if (!slug || slug.includes("/") || slug === "nova" || slug.endsWith("/editar")) {
      return { pageType: "other", pageKey: pathname, slug: null };
    }
    return { pageType: "equipacions-detail", pageKey: pathname, slug };
  }

  if (pathname === "/contacte") {
    return { pageType: "contact", pageKey: pathname, slug: null };
  }

  if (pathname === "/estadistiques" || pathname === "/settings" || pathname === "/login") {
    return { pageType: "admin", pageKey: pathname, slug: null };
  }

  return { pageType: "other", pageKey: pathname, slug: null };
}

function normalizeHeaderValue(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function buildVisitorHash(request: Request) {
  const userAgent = normalizeHeaderValue(request.headers.get("user-agent"));
  const forwardedFor = normalizeHeaderValue(request.headers.get("x-forwarded-for"));
  const realIp = normalizeHeaderValue(request.headers.get("x-real-ip"));
  const acceptLanguage = normalizeHeaderValue(request.headers.get("accept-language"));
  const ipCandidate = forwardedFor.split(",")[0]?.trim() || realIp || "unknown-ip";
  const fingerprint = [ipCandidate, userAgent || "unknown-ua", acceptLanguage || "unknown-lang"].join("|");

  return createHash("sha256").update(fingerprint).digest("hex");
}

export function trackPageView(pathname: string, request: Request) {
  if (!ensureSchema() || !statements) {
    return;
  }

  const classification = classifyPathname(pathname);
  if (classification.pageType === "admin") {
    return;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const cutoff = nowSeconds - DEDUPE_WINDOW_SECONDS;
  const visitorHash = buildVisitorHash(request);
  const userAgent = normalizeHeaderValue(request.headers.get("user-agent"));

  try {
    const existing = statements.findRecentViewStatement.get(visitorHash, classification.pageKey, cutoff) as
      | { id: number }
      | undefined;

    if (existing) {
      return;
    }

    statements.insertViewStatement.run(
      classification.pageKey,
      classification.pageType,
      classification.slug,
      visitorHash,
      userAgent,
      nowSeconds,
    );
  } catch {
    // Best-effort tracking only.
  }
}

export function getWebAnalyticsStats() {
  if (!ensureSchema() || !statements) {
    return emptyAnalytics;
  }

  const last30DaysCutoff = Math.floor(Date.now() / 1000) - LAST_30_DAYS_SECONDS;

  try {
    const summary = statements.getSummaryStatement.get(
      last30DaysCutoff,
      last30DaysCutoff,
      last30DaysCutoff,
    ) as DashboardSummaryRow;

    const topRoutes = statements.getTopRoutesStatement.all(last30DaysCutoff) as Array<{
      slug: string;
      views: number;
    }>;

    const topPages = statements.getTopPagesStatement.all(last30DaysCutoff) as Array<{
      pageKey: string;
      pageType: PageType;
      views: number;
    }>;

    return {
      summary: {
        totalViews: summary.totalViews,
        viewsLast30d: summary.viewsLast30d,
        uniqueVisitorsLast30d: summary.uniqueVisitorsLast30d,
        routeViewsTotal: summary.routeViewsTotal,
        routeViewsLast30d: summary.routeViewsLast30d,
        lastTrackedAt: summary.lastTrackedAt ? new Date(summary.lastTrackedAt * 1000).toISOString() : null,
      },
      topRoutes,
      topPages,
    };
  } catch {
    return emptyAnalytics;
  }
}
