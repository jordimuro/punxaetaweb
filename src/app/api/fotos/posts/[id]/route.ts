import { NextResponse } from "next/server";
import { deletePhotoPost, updatePhotoPost } from "@/lib/photos";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = (await request.json()) as {
    title?: string;
    createdAt?: string;
    images?: string[];
  };
  const title = String(payload.title ?? "").trim();
  const createdAt = String(payload.createdAt ?? "").trim();
  const images = Array.isArray(payload.images)
    ? payload.images.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (!title) {
    return NextResponse.json({ error: "Cal un títol." }, { status: 400 });
  }

  if (!createdAt) {
    return NextResponse.json({ error: "Cal una data de publicació." }, { status: 400 });
  }

  if (images.length === 0) {
    return NextResponse.json({ error: "Cal almenys una imatge." }, { status: 400 });
  }

  const post = await updatePhotoPost({
    id,
    title,
    createdAt,
    images,
  });

  if (!post) {
    return NextResponse.json({ error: "Publicació no trobada." }, { status: 404 });
  }

  return NextResponse.json({ post });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const post = await deletePhotoPost(id);

  if (!post) {
    return NextResponse.json({ error: "Publicació no trobada." }, { status: 404 });
  }

  return NextResponse.json({ post });
}
