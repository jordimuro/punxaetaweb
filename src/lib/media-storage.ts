import "server-only";

import { accessSync, constants as fsConstants, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

export type MediaFolder = "equipacions" | "trofeu";

const folderEnvMap: Record<MediaFolder, string> = {
  equipacions: "EQUIPACIONS_MEDIA_DIR",
  trofeu: "TROFEU_MEDIA_DIR",
};

function getPublicUploadsDir(folder: MediaFolder) {
  return join(process.cwd(), "public", folder, "uploads");
}

function getRailwayBaseDir() {
  return "/app/data";
}

function canUseRailwayVolume() {
  if (!process.env.RAILWAY_PROJECT_ID && !process.env.RAILWAY_ENVIRONMENT_ID && !process.env.RAILWAY_ENVIRONMENT_NAME) {
    return false;
  }

  try {
    accessSync(getRailwayBaseDir(), fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function getDatabaseBaseDir() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return null;
  }

  const rawPath = rawUrl.startsWith("file:") ? rawUrl.slice(5) : rawUrl;
  if (!isAbsolute(rawPath)) {
    return null;
  }

  const baseDir = dirname(rawPath);
  try {
    accessSync(baseDir, fsConstants.W_OK);
    return baseDir;
  } catch {
    return null;
  }
}

function ensureStorageDir(path: string) {
  mkdirSync(path, { recursive: true });
  return path;
}

export function resolveMediaUploadDir(folder: MediaFolder) {
  const envDir = process.env[folderEnvMap[folder]];

  if (envDir) {
    return ensureStorageDir(resolve(envDir));
  }

  const databaseBaseDir = getDatabaseBaseDir();
  if (databaseBaseDir) {
    return ensureStorageDir(join(databaseBaseDir, folder, "uploads"));
  }

  if (canUseRailwayVolume()) {
    return ensureStorageDir(join(getRailwayBaseDir(), folder, "uploads"));
  }

  return ensureStorageDir(getPublicUploadsDir(folder));
}
