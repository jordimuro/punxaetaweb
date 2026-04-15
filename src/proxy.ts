import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const mediaFolders = new Set(["trofeu", "equipacions", "fotos", "gpx"]);

function toMediaApiPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 3) {
    return null;
  }

  const [folder, uploadsSegment, ...fileSegments] = segments;
  if (!mediaFolders.has(folder) || uploadsSegment !== "uploads" || fileSegments.length === 0) {
    return null;
  }

  return `/api/media/${folder}/${fileSegments.join("/")}`;
}

export function proxy(request: NextRequest) {
  const rewrittenPath = toMediaApiPath(request.nextUrl.pathname);
  if (!rewrittenPath) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = rewrittenPath;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/trofeu/uploads/:path*", "/equipacions/uploads/:path*", "/fotos/uploads/:path*", "/gpx/uploads/:path*"],
};
