import "server-only";

import { accessSync, constants as fsConstants, lstatSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

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

function ensurePublicSymlink(publicDir: string, storageDir: string) {
  mkdirSync(dirname(publicDir), { recursive: true });
  mkdirSync(storageDir, { recursive: true });

  try {
    const stat = lstatSync(publicDir);
    if (stat.isSymbolicLink()) {
      return;
    }
    rmSync(publicDir, { recursive: true, force: true });
  } catch {
    // If it does not exist yet, keep going.
  }

  try {
    symlinkSync(storageDir, publicDir, "dir");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "EEXIST") {
      return;
    }

    throw error;
  }
}

export function resolveMediaUploadDir(folder: MediaFolder) {
  const envDir = process.env[folderEnvMap[folder]];
  const publicDir = getPublicUploadsDir(folder);

  if (envDir) {
    const storageDir = resolve(envDir);
    if (storageDir !== publicDir) {
      ensurePublicSymlink(publicDir, storageDir);
    }
    return storageDir;
  }

  if (canUseRailwayVolume()) {
    const storageDir = join(getRailwayBaseDir(), folder, "uploads");
    ensurePublicSymlink(publicDir, storageDir);
    return storageDir;
  }

  return publicDir;
}
