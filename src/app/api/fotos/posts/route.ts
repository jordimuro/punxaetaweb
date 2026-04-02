import { NextResponse } from "next/server";
import { createPhotoPost, listPhotoPosts } from "@/lib/photos";

export const runtime = "nodejs";

export async function GET() {
  const posts = await listPhotoPosts();
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    title?: string;
    author?: string;
    images?: string[];
    createdAt?: string;
  };

  const title = String(payload.title ?? "").trim();
  const author = String(payload.author ?? "Admin").trim() || "Admin";
  const createdAt = String(payload.createdAt ?? "").trim();
  const images = Array.isArray(payload.images)
    ? payload.images.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (!title) {
    return NextResponse.json({ error: "Cal un títol." }, { status: 400 });
  }

  if (images.length === 0) {
    return NextResponse.json({ error: "Cal pujar almenys una imatge." }, { status: 400 });
  }

  const post = await createPhotoPost({ title, author, images, createdAt: createdAt || undefined });
  return NextResponse.json({ post }, { status: 201 });
}
