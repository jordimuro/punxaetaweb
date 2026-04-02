import { NextResponse } from "next/server";
import { deletePhotoPost, updatePhotoPostTitle } from "@/lib/photos";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = (await request.json()) as { title?: string };
  const title = String(payload.title ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "Cal un títol." }, { status: 400 });
  }

  const post = await updatePhotoPostTitle(id, title);

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
