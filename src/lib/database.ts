import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import Database from "better-sqlite3";

function resolveSqlitePath() {
  const rawUrl =
    process.env.DATABASE_URL ??
    (process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_PROJECT_ID
      ? "file:/app/data/dev.db"
      : "file:./dev.db");

  const rawPath = rawUrl.startsWith("file:") ? rawUrl.slice(5) : rawUrl;

  return isAbsolute(rawPath) ? rawPath : resolve(process.cwd(), rawPath);
}

const dbPath = resolveSqlitePath();

mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
