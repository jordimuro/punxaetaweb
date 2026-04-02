import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { resolveMediaUploadDir, type MediaFolder } from "@/lib/media-storage";

type MediaRouteContext = {
  params: Promise<{
    folder: string;
    file: string[];
  }>;
};

type ByteRange = {
  start: number;
  end: number;
};

const allowedFolders = new Set<MediaFolder>(["trofeu", "equipacions", "fotos"]);

const contentTypeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
};

function isSafeSegment(segment: string) {
  return segment !== "." && segment !== ".." && !segment.includes("\0") && !segment.includes("/");
}

function resolveAbsolutePath(folder: MediaFolder, fileSegments: string[]) {
  if (fileSegments.length === 0 || fileSegments.some((segment) => !isSafeSegment(segment))) {
    return null;
  }

  return join(resolveMediaUploadDir(folder), ...fileSegments);
}

function guessContentType(path: string) {
  return contentTypeByExtension[extname(path).toLowerCase()] ?? "application/octet-stream";
}

function parseRangeHeader(rangeHeader: string, fileSize: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) {
    return null;
  }

  const rawStart = match[1];
  const rawEnd = match[2];

  if (!rawStart && !rawEnd) {
    return null;
  }

  let start: number;
  let end: number;

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    start = Number(rawStart);
    if (!Number.isFinite(start) || start < 0) {
      return null;
    }

    if (!rawEnd) {
      end = fileSize - 1;
    } else {
      end = Number(rawEnd);
      if (!Number.isFinite(end) || end < start) {
        return null;
      }
    }
  }

  if (start >= fileSize) {
    return null;
  }

  return {
    start,
    end: Math.min(end, fileSize - 1),
  };
}

async function serveMedia(request: Request, context: MediaRouteContext, headOnly: boolean) {
  const { folder, file } = await context.params;
  if (!allowedFolders.has(folder as MediaFolder)) {
    return new NextResponse(null, { status: 404 });
  }

  const absolutePath = resolveAbsolutePath(folder as MediaFolder, file);
  if (!absolutePath) {
    return new NextResponse(null, { status: 404 });
  }

  let fileStat;
  try {
    fileStat = await stat(absolutePath);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  if (!fileStat.isFile()) {
    return new NextResponse(null, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": guessContentType(absolutePath),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  });

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const parsedRange = parseRangeHeader(rangeHeader, fileStat.size);
    if (!parsedRange) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileStat.size}`,
        },
      });
    }

    const { start, end } = parsedRange;
    const contentLength = end - start + 1;
    headers.set("Content-Range", `bytes ${start}-${end}/${fileStat.size}`);
    headers.set("Content-Length", String(contentLength));

    if (headOnly) {
      return new NextResponse(null, { status: 206, headers });
    }

    const body = Readable.toWeb(createReadStream(absolutePath, { start, end })) as ReadableStream<Uint8Array>;
    return new NextResponse(body, { status: 206, headers });
  }

  headers.set("Content-Length", String(fileStat.size));

  if (headOnly) {
    return new NextResponse(null, { status: 200, headers });
  }

  const body = Readable.toWeb(createReadStream(absolutePath)) as ReadableStream<Uint8Array>;
  return new NextResponse(body, { status: 200, headers });
}

export const runtime = "nodejs";

export async function GET(request: Request, context: MediaRouteContext) {
  return serveMedia(request, context, false);
}

export async function HEAD(request: Request, context: MediaRouteContext) {
  return serveMedia(request, context, true);
}
