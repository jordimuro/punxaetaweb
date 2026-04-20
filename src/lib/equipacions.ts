import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { db } from "@/lib/database";
import { resolveMediaUploadDir } from "@/lib/media-storage";

export type EquipmentRecord = {
  id: string;
  slug: string;
  name: string;
  year: number;
  price: number;
  description: string;
  sizes: string;
  imagePaths: string[];
  videoPaths: string[];
};

export type EquipmentFormValues = {
  id: string;
  originalSlug: string;
  slug: string;
  name: string;
  year: string;
  price: string;
  description: string;
  sizes: string;
};

export type EquipmentFormState = {
  values: EquipmentFormValues;
  errors: Partial<Record<keyof EquipmentFormValues, string>>;
  formError?: string;
};

export type EquipmentMediaChanges = {
  removeImagePaths?: string[];
  removeVideoPaths?: string[];
  orderedImagePaths?: string[];
  orderedVideoPaths?: string[];
};

export type EquipmentSeasonView = "totes" | string;

type EquipmentRow = {
  id: string;
  slug: string;
  name: string;
  year: number;
  price: number;
  description: string;
  sizes: string;
  imagePathsJson: string;
  videoPathsJson: string;
};

const equipmentUploadDir = resolveMediaUploadDir("equipacions");

const createTableStatement = db.prepare(`
  CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    price REAL NOT NULL,
    description TEXT NOT NULL,
    sizes TEXT NOT NULL,
    imagePathsJson TEXT NOT NULL DEFAULT '[]',
    videoPathsJson TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

function ensureColumn(name: string, definition: string) {
  const columns = db.prepare("PRAGMA table_info(equipment)").all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === name)) {
    return;
  }

  db.exec(`ALTER TABLE equipment ADD COLUMN ${definition}`);
}

function ensureSchema() {
  createTableStatement.run();
  ensureColumn("imagePathsJson", "imagePathsJson TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("videoPathsJson", "videoPathsJson TEXT NOT NULL DEFAULT '[]'");
}

const countEquipmentStatement = db.prepare("SELECT COUNT(*) as count FROM equipment");
const listEquipmentStatement = db.prepare(
  "SELECT id, slug, name, year, price, description, sizes, imagePathsJson, videoPathsJson FROM equipment ORDER BY year DESC, name ASC",
);
const findEquipmentStatement = db.prepare(
  "SELECT id, slug, name, year, price, description, sizes, imagePathsJson, videoPathsJson FROM equipment WHERE slug = ? LIMIT 1",
);
const insertEquipmentStatement = db.prepare(`
  INSERT INTO equipment (
    id, slug, name, year, price, description, sizes, imagePathsJson, videoPathsJson
  ) VALUES (
    @id, @slug, @name, @year, @price, @description, @sizes, @imagePathsJson, @videoPathsJson
  )
`);
const seedInsertEquipmentStatement = db.prepare(`
  INSERT OR IGNORE INTO equipment (
    id, slug, name, year, price, description, sizes, imagePathsJson, videoPathsJson
  ) VALUES (
    @id, @slug, @name, @year, @price, @description, @sizes, @imagePathsJson, @videoPathsJson
  )
`);
const updateEquipmentStatement = db.prepare(`
  UPDATE equipment SET
    slug = @slug,
    name = @name,
    year = @year,
    price = @price,
    description = @description,
    sizes = @sizes,
    imagePathsJson = @imagePathsJson,
    videoPathsJson = @videoPathsJson,
    updatedAt = CURRENT_TIMESTAMP
  WHERE id = @id
`);

const seedEquipmentRows = [
  {
    slug: "maillot-principal",
    name: "Maillot principal",
    year: 2026,
    price: 65,
    description: "Peça principal del club amb el blau cel com a color protagonista.",
    sizes: "XS, S, M, L, XL, XXL",
    imagePaths: ["/equipacions/09-frontal-2.jpeg", "/equipacions/10-trasera-2.jpeg"],
    videoPaths: [],
  },
  {
    slug: "xalec-termic",
    name: "Xalec tèrmic",
    year: 2026,
    price: 75,
    description: "Protecció lleugera per a matins frescos i eixides de transició.",
    sizes: "S, M, L, XL, XXL",
    imagePaths: ["/equipacions/01-jersey-frontal.jpeg", "/equipacions/02-jersey-trasera.jpeg"],
    videoPaths: [],
  },
  {
    slug: "manguitos",
    name: "Manguitos",
    year: 2026,
    price: 18,
    description: "Complement d'entretemps per a sumar confort sense perdre identitat.",
    sizes: "S/M, L/XL",
    imagePaths: ["/equipacions/03-manguitos.jpeg"],
    videoPaths: [],
  },
  {
    slug: "calcetins-alts",
    name: "Calcetins alts",
    year: 2026,
    price: 14,
    description: "Acabat blau cel amb lectura neta i esportiva per al conjunt del club.",
    sizes: "38-40, 41-43, 44-46",
    imagePaths: ["/equipacions/04-calcetin.jpeg"],
    videoPaths: [],
  },
  {
    slug: "guants-curts",
    name: "Guants curts",
    year: 2026,
    price: 20,
    description: "Guant lleuger amb marí fosc i imatge molt neta sobre la bici.",
    sizes: "S, M, L, XL",
    imagePaths: ["/equipacions/05-guantes.jpeg"],
    videoPaths: [],
  },
  {
    slug: "culot",
    name: "Culot",
    year: 2026,
    price: 79,
    description: "Base marí intensa per a completar la imatge del mallot principal.",
    sizes: "S, M, L, XL, XXL",
    imagePaths: ["/equipacions/06-culotte.jpeg"],
    videoPaths: [],
  },
  {
    slug: "jaqueta-dhivern",
    name: "Jaqueta d'hivern",
    year: 2026,
    price: 95,
    description: "Versió més calenta per a eixides fredes i dies de més volum de roba.",
    sizes: "S, M, L, XL, XXL",
    imagePaths: ["/equipacions/07-chaqueta.jpeg"],
    videoPaths: [],
  },
  {
    slug: "variant-blanca",
    name: "Variant blanca",
    year: 2026,
    price: 67,
    description: "Alternativa més clara per a tindre una lectura diferent sense perdre el blau.",
    sizes: "XS, S, M, L, XL",
    imagePaths: ["/equipacions/08-varo.jpeg"],
    videoPaths: [],
  },
] satisfies Array<Omit<EquipmentRecord, "id">>;

function seedIfNeeded() {
  ensureSchema();
  const existing = countEquipmentStatement.get() as { count: number };

  if (existing.count > 0) {
    return;
  }

  for (const item of seedEquipmentRows) {
    seedInsertEquipmentStatement.run({
      id: randomUUID(),
      slug: item.slug,
      name: item.name,
      year: item.year,
      price: item.price,
      description: item.description,
      sizes: item.sizes,
      imagePathsJson: JSON.stringify(item.imagePaths),
      videoPathsJson: JSON.stringify(item.videoPaths),
    });
  }
}

function toRecord(row: EquipmentRow): EquipmentRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    year: row.year,
    price: row.price,
    description: row.description,
    sizes: row.sizes,
    imagePaths: JSON.parse(row.imagePathsJson) as string[],
    videoPaths: JSON.parse(row.videoPathsJson) as string[],
  };
}

export const emptyEquipmentValues = (): EquipmentFormValues => ({
  id: "",
  originalSlug: "",
  slug: "",
  name: "",
  year: "",
  price: "",
  description: "",
  sizes: "",
});

export async function listEquipacions() {
  seedIfNeeded();
  const rows = listEquipmentStatement.all() as EquipmentRow[];
  return rows.map(toRecord);
}

export async function getEquipacioBySlug(slug: string) {
  seedIfNeeded();
  const row = findEquipmentStatement.get(slug) as EquipmentRow | undefined;
  return row ? toRecord(row) : null;
}

export async function getEquipacionsBySeason(season: EquipmentSeasonView) {
  const items = await listEquipacions();
  if (season === "totes") {
    return items;
  }

  const year = Number(season);
  return items.filter((item) => item.year === year);
}

export function getEquipacioSeasons(items: EquipmentRecord[]) {
  return [...new Set(items.map((item) => item.year))].sort((left, right) => right - left);
}

function buildErrors(values: EquipmentFormValues) {
  const errors: Partial<Record<keyof EquipmentFormValues, string>> = {};
  const year = Number(values.year);
  const price = Number(values.price);

  if (!values.slug.trim()) errors.slug = "Cal un slug.";
  if (!values.name.trim()) errors.name = "Cal un nom.";
  if (!values.year.trim()) errors.year = "Cal un any.";
  if (!values.price.trim()) errors.price = "Cal un preu.";
  if (!values.description.trim()) errors.description = "Cal una descripció.";
  if (!values.sizes.trim()) errors.sizes = "Calen talles.";
  if (values.year.trim() && (!Number.isFinite(year) || !Number.isInteger(year))) {
    errors.year = "L'any ha de ser un nombre enter.";
  }
  if (values.price.trim() && (!Number.isFinite(price) || price < 0)) {
    errors.price = "El preu ha de ser un número vàlid.";
  }

  return errors;
}

export function equipmentToFormValues(item: EquipmentRecord): EquipmentFormValues {
  return {
    id: item.id,
    originalSlug: item.slug,
    slug: item.slug,
    name: item.name,
    year: String(item.year),
    price: String(item.price),
    description: item.description,
    sizes: item.sizes,
  };
}

export function parseEquipmentFormData(formData: FormData): EquipmentFormState {
  const values: EquipmentFormValues = {
    id: String(formData.get("id") ?? ""),
    originalSlug: String(formData.get("originalSlug") ?? ""),
    slug: String(formData.get("slug") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    year: String(formData.get("year") ?? "").trim(),
    price: String(formData.get("price") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    sizes: String(formData.get("sizes") ?? "").trim(),
  };

  const errors = buildErrors(values);
  if (Object.keys(errors).length > 0) {
    return { values, errors };
  }

  return { values, errors: {} };
}

function normalizeEquipmentFiles(files: File[]) {
  return files.filter((file) => file instanceof File && file.size > 0);
}

async function persistEquipmentFile(file: File, slug: string, kind: "image" | "video") {
  const extension = extname(file.name) || (kind === "video" ? ".mp4" : ".jpg");
  const fileName = `${slug}-${randomUUID()}${extension}`;
  const absolutePath = join(equipmentUploadDir, fileName);
  const relativePath = `/equipacions/uploads/${fileName}`;

  mkdirSync(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return relativePath;
}

function resolveUploadPath(publicPath: string) {
  const uploadPrefix = "/equipacions/uploads/";
  if (!publicPath.startsWith(uploadPrefix)) {
    return null;
  }

  return join(equipmentUploadDir, publicPath.slice(uploadPrefix.length));
}

async function deletePersistedFile(publicPath: string) {
  const absolutePath = resolveUploadPath(publicPath);
  if (!absolutePath) {
    return;
  }

  try {
    await unlink(absolutePath);
  } catch {
    // If the file is already gone, keep the media update flowing.
  }
}

export async function saveEquipmentMedia(
  slug: string,
  imageFiles: File[],
  videoFiles: File[],
  changes: EquipmentMediaChanges = {},
) {
  seedIfNeeded();
  const existing = findEquipmentStatement.get(slug) as EquipmentRow | undefined;
  if (!existing) {
    return null;
  }

  const imagePaths = JSON.parse(existing.imagePathsJson) as string[];
  const videoPaths = JSON.parse(existing.videoPathsJson) as string[];
  const removedImagePaths = new Set(changes.removeImagePaths ?? []);
  const removedVideoPaths = new Set(changes.removeVideoPaths ?? []);
  const orderedImagePaths = (changes.orderedImagePaths ?? imagePaths).filter((path) => imagePaths.includes(path));
  const orderedVideoPaths = (changes.orderedVideoPaths ?? videoPaths).filter((path) => videoPaths.includes(path));

  const nextImagePaths = orderedImagePaths.filter((path) => !removedImagePaths.has(path));
  const nextVideoPaths = orderedVideoPaths.filter((path) => !removedVideoPaths.has(path));

  for (const path of imagePaths) {
    if (!nextImagePaths.includes(path)) {
      await deletePersistedFile(path);
    }
  }

  for (const path of videoPaths) {
    if (!nextVideoPaths.includes(path)) {
      await deletePersistedFile(path);
    }
  }

  for (const file of normalizeEquipmentFiles(imageFiles)) {
    nextImagePaths.push(await persistEquipmentFile(file, slug, "image"));
  }

  for (const file of normalizeEquipmentFiles(videoFiles)) {
    nextVideoPaths.push(await persistEquipmentFile(file, slug, "video"));
  }

  updateEquipmentStatement.run({
    id: existing.id,
    slug: existing.slug,
    name: existing.name,
    year: existing.year,
    price: existing.price,
    description: existing.description,
    sizes: existing.sizes,
    imagePathsJson: JSON.stringify(nextImagePaths),
    videoPathsJson: JSON.stringify(nextVideoPaths),
  });

  return toRecord({
    ...existing,
    imagePathsJson: JSON.stringify(nextImagePaths),
    videoPathsJson: JSON.stringify(nextVideoPaths),
  });
}

export async function createEquipacio(values: EquipmentFormValues) {
  seedIfNeeded();
  const row: EquipmentRow = {
    id: randomUUID(),
    slug: values.slug,
    name: values.name,
    year: Number(values.year),
    price: Number(values.price),
    description: values.description,
    sizes: values.sizes,
    imagePathsJson: JSON.stringify([]),
    videoPathsJson: JSON.stringify([]),
  };

  insertEquipmentStatement.run(row);
  return toRecord(row);
}

export async function updateEquipacio(values: EquipmentFormValues) {
  seedIfNeeded();
  const existing = findEquipmentStatement.get(values.originalSlug || values.slug) as EquipmentRow | undefined;
  const row: EquipmentRow = {
    id: values.id,
    slug: values.slug,
    name: values.name,
    year: Number(values.year),
    price: Number(values.price),
    description: values.description,
    sizes: values.sizes,
    imagePathsJson: existing?.imagePathsJson ?? JSON.stringify([]),
    videoPathsJson: existing?.videoPathsJson ?? JSON.stringify([]),
  };

  updateEquipmentStatement.run(row);
  return toRecord(row);
}

export async function deleteEquipacio(slug: string) {
  seedIfNeeded();
  const row = findEquipmentStatement.get(slug) as EquipmentRow | undefined;
  if (!row) {
    return null;
  }

  db.prepare("DELETE FROM equipment WHERE slug = ?").run(slug);
  return toRecord(row);
}
