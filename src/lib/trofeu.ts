import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { db } from "@/lib/database";
import { resolveMediaUploadDir } from "@/lib/media-storage";

export type TrofeuRecord = {
  id: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  imagePaths: string[];
  pdfPaths: string[];
};

export type TrofeuFormValues = {
  id: string;
  originalSlug: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
};

export type TrofeuFormState = {
  values: TrofeuFormValues;
  errors: Partial<Record<keyof TrofeuFormValues, string>>;
  formError?: string;
};

export type TrofeuMediaChanges = {
  removeImagePaths?: string[];
  removePdfPaths?: string[];
  orderedImagePaths?: string[];
  orderedPdfPaths?: string[];
};

type TrofeuRow = {
  id: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  imagePathsJson: string;
  pdfPathsJson: string;
};

const trofeuUploadDir = resolveMediaUploadDir("trofeu");

const createTableStatement = db.prepare(`
  CREATE TABLE IF NOT EXISTS trofeu_posts (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    imagePathsJson TEXT NOT NULL DEFAULT '[]',
    pdfPathsJson TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

createTableStatement.run();

function ensureColumn(name: string, definition: string) {
  const columns = db.prepare("PRAGMA table_info(trofeu_posts)").all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === name)) {
    return;
  }

  db.exec(`ALTER TABLE trofeu_posts ADD COLUMN ${definition}`);
}

function ensureSchema() {
  createTableStatement.run();
  ensureColumn("imagePathsJson", "imagePathsJson TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("pdfPathsJson", "pdfPathsJson TEXT NOT NULL DEFAULT '[]'");
}

const countStatement = db.prepare("SELECT COUNT(*) as count FROM trofeu_posts");
const listStatement = db.prepare(
  "SELECT id, slug, title, date, excerpt, content, imagePathsJson, pdfPathsJson FROM trofeu_posts ORDER BY date DESC, title ASC",
);
const findStatement = db.prepare(
  "SELECT id, slug, title, date, excerpt, content, imagePathsJson, pdfPathsJson FROM trofeu_posts WHERE slug = ? LIMIT 1",
);
const insertStatement = db.prepare(`
  INSERT INTO trofeu_posts (
    id, slug, title, date, excerpt, content, imagePathsJson, pdfPathsJson
  ) VALUES (
    @id, @slug, @title, @date, @excerpt, @content, @imagePathsJson, @pdfPathsJson
  )
`);
const seedInsertStatement = db.prepare(`
  INSERT OR IGNORE INTO trofeu_posts (
    id, slug, title, date, excerpt, content, imagePathsJson, pdfPathsJson
  ) VALUES (
    @id, @slug, @title, @date, @excerpt, @content, @imagePathsJson, @pdfPathsJson
  )
`);
const updateStatement = db.prepare(`
  UPDATE trofeu_posts SET
    slug = @slug,
    title = @title,
    date = @date,
    excerpt = @excerpt,
    content = @content,
    imagePathsJson = @imagePathsJson,
    pdfPathsJson = @pdfPathsJson,
    updatedAt = CURRENT_TIMESTAMP
  WHERE id = @id
`);

const seedPosts = [
  {
    slug: "segona-edicio-del-trofeu",
    title: "Segona edició del Trofeu Vila de Muro-Punxaeta",
    date: "2026-09-06",
    excerpt: "Segona edició ampliada amb escoles de ciclisme, cadets xics, xiques i júniors femines.",
    content:
      "El Club Ciclista La Punxaeta presenta la segona edició del Trofeu Vila de Muro-Punxaeta, una matinal pensada per a donar protagonisme al ciclisme base i al treball de formació. La prova reunix escoles de ciclisme, categories cadet masculí i femení, i júniors femines en una jornada que vol créixer any rere any amb un format pròxim, ordenat i esportiu. La cita serà el diumenge 6 de setembre de 2026 a les 9:00 del matí.",
    imagePaths: ["/equipacions/09-frontal-2.jpeg"],
    pdfPaths: [],
  },
] satisfies Array<Omit<TrofeuRecord, "id">>;

function seedIfNeeded() {
  ensureSchema();
  const existing = countStatement.get() as { count: number };
  if (existing.count > 0) {
    return;
  }

  for (const item of seedPosts) {
    seedInsertStatement.run({
      id: randomUUID(),
      slug: item.slug,
      title: item.title,
      date: item.date,
      excerpt: item.excerpt,
      content: item.content,
      imagePathsJson: JSON.stringify(item.imagePaths),
      pdfPathsJson: JSON.stringify(item.pdfPaths),
    });
  }
}

function toRecord(row: TrofeuRow): TrofeuRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: row.date,
    excerpt: row.excerpt,
    content: row.content,
    imagePaths: JSON.parse(row.imagePathsJson) as string[],
    pdfPaths: JSON.parse(row.pdfPathsJson) as string[],
  };
}

export const emptyTrofeuValues = (): TrofeuFormValues => ({
  id: "",
  originalSlug: "",
  slug: "",
  title: "",
  date: "",
  excerpt: "",
  content: "",
});

export async function listTrofeuEntrades() {
  seedIfNeeded();
  const rows = listStatement.all() as TrofeuRow[];
  return rows.map(toRecord);
}

export async function getTrofeuBySlug(slug: string) {
  seedIfNeeded();
  const row = findStatement.get(slug) as TrofeuRow | undefined;
  return row ? toRecord(row) : null;
}

export function trofeuToFormValues(item: TrofeuRecord): TrofeuFormValues {
  return {
    id: item.id,
    originalSlug: item.slug,
    slug: item.slug,
    title: item.title,
    date: item.date,
    excerpt: item.excerpt,
    content: item.content,
  };
}

export type TrofeuSeasonView = "totes" | "arxiu" | "properes";

export function getTrofeuStatus(date: string) {
  const today = new Date();
  const normalizedToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const postDate = new Date(`${date}T00:00:00Z`);
  return postDate >= normalizedToday ? "properes" : "arxiu";
}

export async function getTrofeuEntradesByStatus(status: TrofeuSeasonView) {
  const items = await listTrofeuEntrades();
  if (status === "totes") {
    return items;
  }

  return items.filter((item) => getTrofeuStatus(item.date) === status);
}

function buildErrors(values: TrofeuFormValues) {
  const errors: Partial<Record<keyof TrofeuFormValues, string>> = {};
  if (!values.slug.trim()) errors.slug = "Cal un slug.";
  if (!values.content.trim()) errors.content = "Cal un contingut.";
  return errors;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildExcerpt(content: string) {
  const plain = stripHtml(content);
  return plain.length > 180 ? `${plain.slice(0, 177).trimEnd()}...` : plain;
}

export function parseTrofeuFormData(formData: FormData): TrofeuFormState {
  const values: TrofeuFormValues = {
    id: String(formData.get("id") ?? ""),
    originalSlug: String(formData.get("originalSlug") ?? ""),
    slug: String(formData.get("slug") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    date: String(formData.get("date") ?? "").trim(),
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
  };

  const errors = buildErrors(values);
  return Object.keys(errors).length > 0 ? { values, errors } : { values, errors: {} };
}

function normalizeFiles(files: File[]) {
  return files.filter((file) => file instanceof File && file.size > 0);
}

async function persistFile(file: File, slug: string, kind: "image" | "pdf") {
  const extension = extname(file.name) || (kind === "pdf" ? ".pdf" : ".jpg");
  const fileName = `${slug}-${randomUUID()}${extension}`;
  const absolutePath = join(trofeuUploadDir, fileName);
  const relativePath = `/trofeu/uploads/${fileName}`;

  mkdirSync(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return relativePath;
}

async function deletePersistedFile(publicPath: string) {
  const prefix = "/trofeu/uploads/";
  if (!publicPath.startsWith(prefix)) {
    return;
  }

  try {
    await unlink(join(trofeuUploadDir, publicPath.slice(prefix.length)));
  } catch {
    // ignore missing file
  }
}

export async function saveTrofeuMedia(
  slug: string,
  imageFiles: File[],
  pdfFiles: File[],
  changes: TrofeuMediaChanges = {},
) {
  seedIfNeeded();
  const existing = findStatement.get(slug) as TrofeuRow | undefined;
  if (!existing) {
    return null;
  }

  const imagePaths = JSON.parse(existing.imagePathsJson) as string[];
  const pdfPaths = JSON.parse(existing.pdfPathsJson) as string[];
  const removedImagePaths = new Set(changes.removeImagePaths ?? []);
  const removedPdfPaths = new Set(changes.removePdfPaths ?? []);
  const orderedImagePaths = (changes.orderedImagePaths ?? imagePaths).filter((path) => imagePaths.includes(path));
  const orderedPdfPaths = (changes.orderedPdfPaths ?? pdfPaths).filter((path) => pdfPaths.includes(path));

  const nextImagePaths = orderedImagePaths.filter((path) => !removedImagePaths.has(path));
  const nextPdfPaths = orderedPdfPaths.filter((path) => !removedPdfPaths.has(path));

  for (const path of imagePaths) {
    if (!nextImagePaths.includes(path)) {
      await deletePersistedFile(path);
    }
  }

  for (const path of pdfPaths) {
    if (!nextPdfPaths.includes(path)) {
      await deletePersistedFile(path);
    }
  }

  for (const file of normalizeFiles(imageFiles)) {
    nextImagePaths.push(await persistFile(file, slug, "image"));
  }

  for (const file of normalizeFiles(pdfFiles)) {
    nextPdfPaths.push(await persistFile(file, slug, "pdf"));
  }

  updateStatement.run({
    id: existing.id,
    slug: existing.slug,
    title: existing.title,
    date: existing.date,
    excerpt: existing.excerpt,
    content: existing.content,
    imagePathsJson: JSON.stringify(nextImagePaths),
    pdfPathsJson: JSON.stringify(nextPdfPaths),
  });

  return toRecord({
    ...existing,
    imagePathsJson: JSON.stringify(nextImagePaths),
    pdfPathsJson: JSON.stringify(nextPdfPaths),
  });
}

export async function createTrofeuEntrada(values: TrofeuFormValues) {
  seedIfNeeded();
  const row: TrofeuRow = {
    id: randomUUID(),
    slug: values.slug,
    title: values.title || values.slug,
    date: values.date || new Date().toISOString().slice(0, 10),
    excerpt: buildExcerpt(values.content),
    content: values.content,
    imagePathsJson: JSON.stringify([]),
    pdfPathsJson: JSON.stringify([]),
  };

  insertStatement.run(row);
  return toRecord(row);
}

export async function updateTrofeuEntrada(values: TrofeuFormValues) {
  seedIfNeeded();
  const existing = findStatement.get(values.originalSlug || values.slug) as TrofeuRow | undefined;
  const row: TrofeuRow = {
    id: values.id,
    slug: values.slug,
    title: values.title || existing?.title || values.slug,
    date: values.date || existing?.date || new Date().toISOString().slice(0, 10),
    excerpt: buildExcerpt(values.content),
    content: values.content,
    imagePathsJson: existing?.imagePathsJson ?? JSON.stringify([]),
    pdfPathsJson: existing?.pdfPathsJson ?? JSON.stringify([]),
  };

  updateStatement.run(row);
  return toRecord(row);
}

export async function deleteTrofeuEntrada(slug: string) {
  seedIfNeeded();
  const row = findStatement.get(slug) as TrofeuRow | undefined;
  if (!row) {
    return null;
  }

  db.prepare("DELETE FROM trofeu_posts WHERE slug = ?").run(slug);
  return toRecord(row);
}
