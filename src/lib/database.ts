import "server-only";

import Database from "better-sqlite3";

function resolveSqlitePath() {
  const rawUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  return rawUrl.startsWith("file:") ? rawUrl.slice(5) : rawUrl;
}

const dbPath = resolveSqlitePath();

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
