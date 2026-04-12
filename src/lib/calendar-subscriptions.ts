import "server-only";

import { createHash } from "node:crypto";
import { db } from "@/lib/database";

type IcsStatsRow = {
  subscribersTotal: number;
  subscribersLast30d: number;
  requestsTotal: number;
  requestsLast30d: number;
  lastSeenAt: string | null;
};

const emptyStats = {
  subscribersTotal: 0,
  subscribersLast30d: 0,
  requestsTotal: 0,
  requestsLast30d: 0,
  lastSeenAt: null as string | null,
};

const createTableStatement = db.prepare(`
  CREATE TABLE IF NOT EXISTS calendar_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_hash TEXT NOT NULL UNIQUE,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    last_user_agent TEXT,
    request_count INTEGER NOT NULL DEFAULT 1
  )
`);

const createLastSeenIndexStatement = db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_calendar_subscriptions_last_seen_at
  ON calendar_subscriptions(last_seen_at)
`);

let schemaReady = false;

function ensureSchema() {
  if (schemaReady) {
    return true;
  }

  try {
    createTableStatement.run();
    createLastSeenIndexStatement.run();
    schemaReady = true;
    return true;
  } catch {
    return false;
  }
}

const findSubscriberStatement = db.prepare(
  "SELECT id, request_count FROM calendar_subscriptions WHERE subscriber_hash = ?",
);

const insertSubscriberStatement = db.prepare(`
  INSERT INTO calendar_subscriptions (
    subscriber_hash,
    first_seen_at,
    last_seen_at,
    last_user_agent,
    request_count
  )
  VALUES (?, ?, ?, ?, 1)
`);

const updateSubscriberStatement = db.prepare(`
  UPDATE calendar_subscriptions
  SET
    last_seen_at = ?,
    last_user_agent = ?,
    request_count = request_count + 1
  WHERE subscriber_hash = ?
`);

const getStatsStatement = db.prepare(`
  SELECT
    COUNT(*) AS subscribersTotal,
    COUNT(CASE WHEN last_seen_at >= datetime('now', '-30 days') THEN 1 END) AS subscribersLast30d,
    COALESCE(SUM(request_count), 0) AS requestsTotal,
    COALESCE(SUM(CASE WHEN last_seen_at >= datetime('now', '-30 days') THEN request_count ELSE 0 END), 0) AS requestsLast30d,
    MAX(last_seen_at) AS lastSeenAt
  FROM calendar_subscriptions
`);

const registerRequestTransaction = db.transaction((subscriberHash: string, nowIso: string, userAgent: string) => {
  const existing = findSubscriberStatement.get(subscriberHash) as
    | { id: number; request_count: number }
    | undefined;

  if (!existing) {
    insertSubscriberStatement.run(subscriberHash, nowIso, nowIso, userAgent);
    return;
  }

  updateSubscriberStatement.run(nowIso, userAgent, subscriberHash);
});

function normalizeHeaderValue(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function buildSubscriberHash({
  userAgent,
  forwardedFor,
  realIp,
  acceptLanguage,
}: {
  userAgent: string;
  forwardedFor: string;
  realIp: string;
  acceptLanguage: string;
}) {
  const ipCandidate = forwardedFor.split(",")[0]?.trim() || realIp || "unknown-ip";
  const fingerprint = [ipCandidate, userAgent || "unknown-ua", acceptLanguage || "unknown-lang"].join("|");

  return createHash("sha256").update(fingerprint).digest("hex");
}

export function registerIcsSubscriptionRequest(request: Request) {
  if (!ensureSchema()) {
    return;
  }

  const userAgent = normalizeHeaderValue(request.headers.get("user-agent"));
  const forwardedFor = normalizeHeaderValue(request.headers.get("x-forwarded-for"));
  const realIp = normalizeHeaderValue(request.headers.get("x-real-ip"));
  const acceptLanguage = normalizeHeaderValue(request.headers.get("accept-language"));
  const subscriberHash = buildSubscriberHash({ userAgent, forwardedFor, realIp, acceptLanguage });
  const nowIso = new Date().toISOString();

  try {
    registerRequestTransaction(subscriberHash, nowIso, userAgent);
  } catch {
    // Ignore tracking failures so the ICS feed always works.
  }
}

export function getIcsSubscriptionStats() {
  if (!ensureSchema()) {
    return emptyStats;
  }

  try {
    const row = getStatsStatement.get() as IcsStatsRow;

    return {
      subscribersTotal: row.subscribersTotal,
      subscribersLast30d: row.subscribersLast30d,
      requestsTotal: row.requestsTotal,
      requestsLast30d: row.requestsLast30d,
      lastSeenAt: row.lastSeenAt,
    };
  } catch {
    return emptyStats;
  }
}
