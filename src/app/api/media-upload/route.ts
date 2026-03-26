import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { NextResponse } from "next/server";

const allowedFolders = new Set(["trofeu", "equipacions"]);

export async function POST(request: Request) {
  const url = new URL(request.url);
  const folder = url.searchParams.get("folder") ?? "";

  if (!allowedFolders.has(folder)) {
    return NextResponse.json({ error: "Carpeta no permesa." }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fitxer invàlid." }, { status: 400 });
  }

  const extension = extname(file.name) || ".jpg";
  const fileName = `${folder}-${randomUUID()}${extension}`;
  const absolutePath = join(process.cwd(), "public", folder, "uploads", fileName);
  const publicPath = `/${folder}/uploads/${fileName}`;

  mkdirSync(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: publicPath });
}
