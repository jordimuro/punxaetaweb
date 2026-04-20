import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { db } from "@/lib/database";
import { ROUTE_TEMPLATES_CATALOG } from "@/data/route-templates-catalog";
import { resolveMediaUploadDir } from "@/lib/media-storage";
import type { RouteFormValues } from "@/lib/routes";

export type RouteTemplateRecord = {
  id: string;
  routeType: "ruta" | "cicloturista";
  slug: string;
  name: string;
  breakfastPlace: string;
  departureTimeOne: string;
  departureTimeTwo: string | null;
  distanceToBreakfast: number;
  elevationToBreakfast: number;
  kms: number;
  elevationGain: number;
  town: string;
  summary: string;
  meetingPoint: string;
  meetingPointSecondary: string | null;
  notes: string;
  externalUrl: string | null;
  gpxRouteName: string | null;
  gpxFileName: string | null;
  gpxPath: string | null;
  gpxContent: string | null;
  departureTimeSecondary: string | null;
  kmsSecondary: number | null;
  elevationGainSecondary: number | null;
  gpxRouteNameSecondary: string | null;
  gpxFileNameSecondary: string | null;
  gpxPathSecondary: string | null;
  gpxContentSecondary: string | null;
};

export type RouteTemplateFormValues = {
  id: string;
  originalSlug: string;
  routeType: "ruta" | "cicloturista";
  slug: string;
  name: string;
  breakfastPlace: string;
  departureTimeOne: string;
  departureTimeTwo: string;
  distanceToBreakfast: string;
  elevationToBreakfast: string;
  kms: string;
  elevationGain: string;
  town: string;
  summary: string;
  meetingPoint: string;
  meetingPointSecondary: string;
  notes: string;
  externalUrl: string;
  gpxRouteName: string;
  gpxFileName: string;
  gpxPath: string;
  gpxContent: string;
  departureTimeSecondary: string;
  kmsSecondary: string;
  elevationGainSecondary: string;
  gpxRouteNameSecondary: string;
  gpxFileNameSecondary: string;
  gpxPathSecondary: string;
  gpxContentSecondary: string;
};

export type RouteTemplateFormState = {
  values: RouteTemplateFormValues;
  errors: Partial<Record<keyof RouteTemplateFormValues, string>>;
  formError?: string;
};

type RouteTemplateRow = {
  id: string;
  routeType: "ruta" | "cicloturista";
  slug: string;
  name: string;
  breakfastPlace: string;
  departureTimeOne: string;
  departureTimeTwo: string | null;
  distanceToBreakfast: number;
  elevationToBreakfast: number;
  kms: number;
  elevationGain: number;
  town: string;
  summary: string;
  meetingPoint: string;
  meetingPointSecondary: string | null;
  notes: string;
  externalUrl: string | null;
  gpxRouteName: string | null;
  gpxFileName: string | null;
  gpxPath: string | null;
  gpxContent: string | null;
  departureTimeSecondary: string | null;
  kmsSecondary: number | null;
  elevationGainSecondary: number | null;
  gpxRouteNameSecondary: string | null;
  gpxFileNameSecondary: string | null;
  gpxPathSecondary: string | null;
  gpxContentSecondary: string | null;
};

export type RouteTemplateOption = {
  slug: string;
  name: string;
  routeType: "ruta" | "cicloturista";
};

const createTableStatement = db.prepare(`
  CREATE TABLE IF NOT EXISTS route_templates (
    id TEXT PRIMARY KEY,
    routeType TEXT NOT NULL DEFAULT 'ruta',
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    breakfastPlace TEXT NOT NULL,
    departureTimeOne TEXT NOT NULL,
    departureTimeTwo TEXT,
    distanceToBreakfast INTEGER NOT NULL DEFAULT 0,
    elevationToBreakfast INTEGER NOT NULL DEFAULT 0,
    kms INTEGER NOT NULL,
    elevationGain INTEGER NOT NULL,
    town TEXT NOT NULL,
    summary TEXT NOT NULL,
    meetingPoint TEXT NOT NULL,
    meetingPointSecondary TEXT,
    notes TEXT NOT NULL,
    externalUrl TEXT,
    gpxRouteName TEXT,
    gpxFileName TEXT,
    gpxPath TEXT,
    gpxContent TEXT,
    departureTimeSecondary TEXT,
    kmsSecondary INTEGER,
    elevationGainSecondary INTEGER,
    gpxRouteNameSecondary TEXT,
    gpxFileNameSecondary TEXT,
    gpxPathSecondary TEXT,
    gpxContentSecondary TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

createTableStatement.run();

function ensureColumn(name: string, definition: string) {
  const columns = db.prepare("PRAGMA table_info(route_templates)").all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === name)) {
    return;
  }
  db.exec(`ALTER TABLE route_templates ADD COLUMN ${definition}`);
}

function ensureSchema() {
  createTableStatement.run();
  ensureColumn("routeType", "routeType TEXT NOT NULL DEFAULT 'ruta'");
  ensureColumn("distanceToBreakfast", "distanceToBreakfast INTEGER NOT NULL DEFAULT 0");
  ensureColumn("elevationToBreakfast", "elevationToBreakfast INTEGER NOT NULL DEFAULT 0");
  ensureColumn("meetingPointSecondary", "meetingPointSecondary TEXT");
  ensureColumn("departureTimeSecondary", "departureTimeSecondary TEXT");
  ensureColumn("kmsSecondary", "kmsSecondary INTEGER");
  ensureColumn("elevationGainSecondary", "elevationGainSecondary INTEGER");
  ensureColumn("externalUrl", "externalUrl TEXT");
  ensureColumn("gpxRouteName", "gpxRouteName TEXT");
  ensureColumn("gpxFileName", "gpxFileName TEXT");
  ensureColumn("gpxPath", "gpxPath TEXT");
  ensureColumn("gpxContent", "gpxContent TEXT");
  ensureColumn("gpxRouteNameSecondary", "gpxRouteNameSecondary TEXT");
  ensureColumn("gpxFileNameSecondary", "gpxFileNameSecondary TEXT");
  ensureColumn("gpxPathSecondary", "gpxPathSecondary TEXT");
  ensureColumn("gpxContentSecondary", "gpxContentSecondary TEXT");
}

const listStatement = db.prepare(
  "SELECT id, routeType, slug, name, breakfastPlace, departureTimeOne, departureTimeTwo, distanceToBreakfast, elevationToBreakfast, kms, elevationGain, town, summary, meetingPoint, meetingPointSecondary, notes, externalUrl, gpxRouteName, gpxFileName, gpxPath, gpxContent, departureTimeSecondary, kmsSecondary, elevationGainSecondary, gpxRouteNameSecondary, gpxFileNameSecondary, gpxPathSecondary, gpxContentSecondary FROM route_templates ORDER BY name ASC",
);
const findBySlugStatement = db.prepare(
  "SELECT id, routeType, slug, name, breakfastPlace, departureTimeOne, departureTimeTwo, distanceToBreakfast, elevationToBreakfast, kms, elevationGain, town, summary, meetingPoint, meetingPointSecondary, notes, externalUrl, gpxRouteName, gpxFileName, gpxPath, gpxContent, departureTimeSecondary, kmsSecondary, elevationGainSecondary, gpxRouteNameSecondary, gpxFileNameSecondary, gpxPathSecondary, gpxContentSecondary FROM route_templates WHERE slug = ? LIMIT 1",
);
const insertStatement = db.prepare(`
  INSERT INTO route_templates (
    id, routeType, slug, name, breakfastPlace, departureTimeOne, departureTimeTwo,
    distanceToBreakfast, elevationToBreakfast, kms, elevationGain, town, departureTimeSecondary,
    kmsSecondary, elevationGainSecondary,
    summary, meetingPoint, meetingPointSecondary, notes, externalUrl, gpxRouteName, gpxFileName, gpxPath, gpxContent,
    gpxRouteNameSecondary, gpxFileNameSecondary, gpxPathSecondary, gpxContentSecondary
  ) VALUES (
    @id, @routeType, @slug, @name, @breakfastPlace, @departureTimeOne, @departureTimeTwo,
    @distanceToBreakfast, @elevationToBreakfast, @kms, @elevationGain, @town, @departureTimeSecondary,
    @kmsSecondary, @elevationGainSecondary,
    @summary, @meetingPoint, @meetingPointSecondary, @notes, @externalUrl, @gpxRouteName, @gpxFileName, @gpxPath, @gpxContent,
    @gpxRouteNameSecondary, @gpxFileNameSecondary, @gpxPathSecondary, @gpxContentSecondary
  )
`);
const updateStatement = db.prepare(`
  UPDATE route_templates SET
    routeType = @routeType,
    slug = @slug,
    name = @name,
    breakfastPlace = @breakfastPlace,
    departureTimeOne = @departureTimeOne,
    departureTimeTwo = @departureTimeTwo,
    distanceToBreakfast = @distanceToBreakfast,
    elevationToBreakfast = @elevationToBreakfast,
    kms = @kms,
    elevationGain = @elevationGain,
    departureTimeSecondary = @departureTimeSecondary,
    kmsSecondary = @kmsSecondary,
    elevationGainSecondary = @elevationGainSecondary,
    town = @town,
    summary = @summary,
    meetingPoint = @meetingPoint,
    meetingPointSecondary = @meetingPointSecondary,
    notes = @notes,
    externalUrl = @externalUrl,
    gpxRouteName = @gpxRouteName,
    gpxFileName = @gpxFileName,
    gpxPath = @gpxPath,
    gpxContent = @gpxContent,
    gpxRouteNameSecondary = @gpxRouteNameSecondary,
    gpxFileNameSecondary = @gpxFileNameSecondary,
    gpxPathSecondary = @gpxPathSecondary,
    gpxContentSecondary = @gpxContentSecondary,
    updatedAt = CURRENT_TIMESTAMP
  WHERE id = @id
`);
const insertOrIgnoreStatement = db.prepare(`
  INSERT OR IGNORE INTO route_templates (
    id, routeType, slug, name, breakfastPlace, departureTimeOne, departureTimeTwo,
    distanceToBreakfast, elevationToBreakfast, kms, elevationGain, town, departureTimeSecondary,
    kmsSecondary, elevationGainSecondary,
    summary, meetingPoint, meetingPointSecondary, notes, externalUrl, gpxRouteName, gpxFileName, gpxPath, gpxContent,
    gpxRouteNameSecondary, gpxFileNameSecondary, gpxPathSecondary, gpxContentSecondary
  ) VALUES (
    @id, @routeType, @slug, @name, @breakfastPlace, @departureTimeOne, @departureTimeTwo,
    @distanceToBreakfast, @elevationToBreakfast, @kms, @elevationGain, @town, @departureTimeSecondary,
    @kmsSecondary, @elevationGainSecondary,
    @summary, @meetingPoint, @meetingPointSecondary, @notes, @externalUrl, @gpxRouteName, @gpxFileName, @gpxPath, @gpxContent,
    @gpxRouteNameSecondary, @gpxFileNameSecondary, @gpxPathSecondary, @gpxContentSecondary
  )
`);
const forceBreakfastPlaceStatement = db.prepare(
  "UPDATE route_templates SET breakfastPlace = 'Per determinar', updatedAt = CURRENT_TIMESTAMP WHERE slug = ?",
);

const gpxUploadDir = resolveMediaUploadDir("gpx");
const gpxPublicPrefix = "/gpx/uploads/";

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function buildGpxStorageTarget(originalFileName: string, slug: string) {
  const extension = extname(originalFileName).toLowerCase() || ".gpx";
  const normalizedExtension = extension === ".xml" ? ".gpx" : extension;
  const safeSlug = sanitizeFileName(slug) || "ruta-base";
  const fileName = `${safeSlug}-${randomUUID()}${normalizedExtension}`;
  return {
    fileName,
    absolutePath: join(gpxUploadDir, fileName),
    publicPath: `${gpxPublicPrefix}${fileName}`,
  };
}

function resolveAbsoluteGpxPath(publicPath: string | null | undefined) {
  if (!publicPath || !publicPath.startsWith(gpxPublicPrefix)) {
    return null;
  }
  const fileName = basename(publicPath);
  if (!fileName || fileName === "." || fileName === "..") {
    return null;
  }
  return join(gpxUploadDir, fileName);
}

function normalizeRouteName(value: string) {
  return value.replace(/^nom\s+recorregut\s*[12]\s*:\s*/i, "").trim();
}

function normalizeDepartureTimes(departureTimes: string[]) {
  const [first = "", second = ""] = departureTimes;
  return {
    departureTimeOne: first,
    departureTimeTwo: second || null,
  };
}

function buildSummary(notes: string) {
  const normalized = notes.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > 180 ? `${normalized.slice(0, 177).trimEnd()}...` : normalized;
}

function toRecord(row: RouteTemplateRow): RouteTemplateRecord {
  return {
    ...row,
    routeType: row.routeType ?? "ruta",
  };
}

function buildErrors(values: RouteTemplateFormValues) {
  const errors: Partial<Record<keyof RouteTemplateFormValues, string>> = {};
  const isCicloturista = values.routeType === "cicloturista";

  if (values.routeType !== "ruta" && values.routeType !== "cicloturista") {
    errors.routeType = "Tipus de ruta no vàlid.";
  }
  if (!values.slug.trim()) errors.slug = "Cal un slug.";
  if (!values.name.trim()) errors.name = "Cal un nom.";
  if (!values.departureTimeOne.trim()) errors.departureTimeOne = "Cal com a mínim una hora d'eixida.";
  if (!values.kms.trim()) errors.kms = "Cal indicar els quilòmetres.";
  if (!values.elevationGain.trim()) errors.elevationGain = "Cal indicar el desnivell.";
  if (!values.town.trim()) errors.town = "Cal indicar la població.";
  if (!values.meetingPoint.trim()) errors.meetingPoint = "Cal un punt de trobada.";
  if (!isCicloturista && !values.notes.trim()) errors.notes = "Cal un recorregut.";
  if (!values.gpxRouteName.trim()) errors.gpxRouteName = "Cal indicar un nom per al recorregut principal.";
  if (!isCicloturista && !values.breakfastPlace.trim()) errors.breakfastPlace = "Cal un lloc d'esmorzar.";
  if (!isCicloturista && !values.distanceToBreakfast.trim()) {
    errors.distanceToBreakfast = "Cal indicar la distància fins a esmorzar.";
  }
  if (!isCicloturista && !values.elevationToBreakfast.trim()) {
    errors.elevationToBreakfast = "Cal indicar el desnivell fins a esmorzar.";
  }
  if (isCicloturista) {
    if (!values.externalUrl.trim()) {
      errors.externalUrl = "Cal indicar la web de la marxa.";
    } else {
      try {
        const parsedUrl = new URL(values.externalUrl);
        if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
          errors.externalUrl = "La web ha de començar per http:// o https://.";
        }
      } catch {
        errors.externalUrl = "La web de la marxa no és vàlida.";
      }
    }
    const hasSecondaryName = values.gpxRouteNameSecondary.trim().length > 0;
    if (hasSecondaryName) {
      if (!values.meetingPointSecondary.trim()) {
        errors.meetingPointSecondary = "Cal indicar un punt d'eixida del segon recorregut.";
      }
      if (!values.departureTimeSecondary.trim()) {
        errors.departureTimeSecondary = "Cal indicar una hora d'eixida del segon recorregut.";
      }
      if (!values.kmsSecondary.trim()) errors.kmsSecondary = "Cal indicar els quilòmetres del segon recorregut.";
      if (!values.elevationGainSecondary.trim()) {
        errors.elevationGainSecondary = "Cal indicar el desnivell del segon recorregut.";
      }
    }
  }

  return errors;
}

export const emptyRouteTemplateValues = (): RouteTemplateFormValues => ({
  id: "",
  originalSlug: "",
  routeType: "ruta",
  slug: "",
  name: "",
  breakfastPlace: "",
  departureTimeOne: "",
  departureTimeTwo: "",
  distanceToBreakfast: "",
  elevationToBreakfast: "",
  kms: "",
  elevationGain: "",
  town: "",
  summary: "",
  meetingPoint: "",
  meetingPointSecondary: "",
  notes: "",
  externalUrl: "",
  gpxRouteName: "",
  gpxFileName: "",
  gpxPath: "",
  gpxContent: "",
  departureTimeSecondary: "",
  kmsSecondary: "",
  elevationGainSecondary: "",
  gpxRouteNameSecondary: "",
  gpxFileNameSecondary: "",
  gpxPathSecondary: "",
  gpxContentSecondary: "",
});

export async function listRouteTemplates() {
  ensureSchema();
  const rows = listStatement.all() as RouteTemplateRow[];
  return rows.map(toRecord);
}

export async function listRouteTemplateOptions() {
  const templates = await listRouteTemplates();
  return templates.map((template) => ({
    slug: template.slug,
    name: template.name,
    routeType: template.routeType,
  })) as RouteTemplateOption[];
}

export async function getRouteTemplateBySlug(slug: string) {
  ensureSchema();
  const row = findBySlugStatement.get(slug) as RouteTemplateRow | undefined;
  return row ? toRecord(row) : null;
}

export function routeTemplateToFormValues(template: RouteTemplateRecord): RouteTemplateFormValues {
  return {
    id: template.id,
    originalSlug: template.slug,
    routeType: template.routeType,
    slug: template.slug,
    name: template.name,
    breakfastPlace: template.breakfastPlace,
    departureTimeOne: template.departureTimeOne,
    departureTimeTwo: template.departureTimeTwo ?? "",
    distanceToBreakfast: String(template.distanceToBreakfast),
    elevationToBreakfast: String(template.elevationToBreakfast),
    kms: String(template.kms),
    elevationGain: String(template.elevationGain),
    town: template.town,
    summary: template.summary,
    meetingPoint: template.meetingPoint,
    meetingPointSecondary: template.meetingPointSecondary ?? "",
    notes: template.notes,
    externalUrl: template.externalUrl ?? "",
    gpxRouteName: template.gpxRouteName ?? "",
    gpxFileName: template.gpxFileName ?? "",
    gpxPath: template.gpxPath ?? "",
    gpxContent: template.gpxContent ?? "",
    departureTimeSecondary: template.departureTimeSecondary ?? "",
    kmsSecondary: template.kmsSecondary !== null ? String(template.kmsSecondary) : "",
    elevationGainSecondary:
      template.elevationGainSecondary !== null ? String(template.elevationGainSecondary) : "",
    gpxRouteNameSecondary: template.gpxRouteNameSecondary ?? "",
    gpxFileNameSecondary: template.gpxFileNameSecondary ?? "",
    gpxPathSecondary: template.gpxPathSecondary ?? "",
    gpxContentSecondary: template.gpxContentSecondary ?? "",
  };
}

function buildUniqueDuplicateSlug(baseSlug: string, takenSlugs: Set<string>) {
  const trimmedBaseSlug = baseSlug.trim();
  const duplicateBase = trimmedBaseSlug.endsWith("-copia") ? trimmedBaseSlug : `${trimmedBaseSlug}-copia`;
  if (!takenSlugs.has(duplicateBase)) {
    return duplicateBase;
  }
  let suffix = 2;
  let candidate = `${duplicateBase}-${suffix}`;
  while (takenSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${duplicateBase}-${suffix}`;
  }
  return candidate;
}

export async function buildDuplicateRouteTemplateValues(slug: string) {
  const template = await getRouteTemplateBySlug(slug);
  if (!template) {
    return null;
  }
  const existing = await listRouteTemplates();
  const takenSlugs = new Set(existing.map((item) => item.slug));
  return {
    ...routeTemplateToFormValues(template),
    id: "",
    originalSlug: "",
    slug: buildUniqueDuplicateSlug(template.slug, takenSlugs),
  };
}

export function parseRouteTemplateFormData(formData: FormData): RouteTemplateFormState {
  const notes = String(formData.get("notes") ?? "").trim();
  const gpxContent = String(formData.get("gpxContent") ?? "");
  const gpxContentSecondary = String(formData.get("gpxContentSecondary") ?? "");
  const isCicloturista = String(formData.get("routeType") ?? "ruta").trim() === "cicloturista";
  const gpxRouteName = normalizeRouteName(String(formData.get("gpxRouteName") ?? "").trim());
  const gpxRouteNameSecondary = normalizeRouteName(String(formData.get("gpxRouteNameSecondary") ?? "").trim());

  const values: RouteTemplateFormValues = {
    id: String(formData.get("id") ?? ""),
    originalSlug: String(formData.get("originalSlug") ?? ""),
    routeType: isCicloturista ? "cicloturista" : "ruta",
    slug: String(formData.get("slug") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    breakfastPlace: String(formData.get("breakfastPlace") ?? "").trim(),
    departureTimeOne: String(formData.get("departureTimeOne") ?? "").trim(),
    departureTimeTwo: String(formData.get("departureTimeTwo") ?? "").trim(),
    distanceToBreakfast: String(formData.get("distanceToBreakfast") ?? "").trim(),
    elevationToBreakfast: String(formData.get("elevationToBreakfast") ?? "").trim(),
    kms: String(formData.get("kms") ?? "").trim(),
    elevationGain: String(formData.get("elevationGain") ?? "").trim(),
    town: String(formData.get("town") ?? "").trim(),
    summary: buildSummary(notes),
    meetingPoint: String(formData.get("meetingPoint") ?? "").trim(),
    meetingPointSecondary: String(formData.get("meetingPointSecondary") ?? "").trim(),
    notes,
    externalUrl: String(formData.get("externalUrl") ?? "").trim(),
    gpxRouteName: gpxRouteName || (isCicloturista ? "Recorregut 1" : "Recorregut principal"),
    gpxFileName: String(formData.get("gpxFileName") ?? "").trim(),
    gpxPath: String(formData.get("gpxPath") ?? "").trim(),
    gpxContent,
    departureTimeSecondary: String(formData.get("departureTimeSecondary") ?? "").trim(),
    kmsSecondary: String(formData.get("kmsSecondary") ?? "").trim(),
    elevationGainSecondary: String(formData.get("elevationGainSecondary") ?? "").trim(),
    gpxRouteNameSecondary: isCicloturista ? gpxRouteNameSecondary : "",
    gpxFileNameSecondary: String(formData.get("gpxFileNameSecondary") ?? "").trim(),
    gpxPathSecondary: String(formData.get("gpxPathSecondary") ?? "").trim(),
    gpxContentSecondary,
  };

  const errors = buildErrors(values);
  if (Object.keys(errors).length > 0) {
    return { values, errors };
  }

  return { values, errors: {} };
}

export async function createRouteTemplate(values: RouteTemplateFormValues) {
  ensureSchema();
  const isCicloturista = values.routeType === "cicloturista";
  const hasSecondaryVariant = isCicloturista && values.gpxRouteNameSecondary.trim().length > 0;

  const row: RouteTemplateRow = {
    id: randomUUID(),
    routeType: values.routeType,
    slug: values.slug,
    name: values.name,
    breakfastPlace: isCicloturista ? "Marxa cicloturista" : values.breakfastPlace,
    ...normalizeDepartureTimes(isCicloturista ? [values.departureTimeOne] : [values.departureTimeOne, values.departureTimeTwo].filter(Boolean)),
    distanceToBreakfast: isCicloturista ? 0 : Number(values.distanceToBreakfast),
    elevationToBreakfast: isCicloturista ? 0 : Number(values.elevationToBreakfast),
    kms: Number(values.kms),
    elevationGain: Number(values.elevationGain),
    town: values.town,
    summary: values.summary,
    meetingPoint: values.meetingPoint,
    meetingPointSecondary: hasSecondaryVariant ? values.meetingPointSecondary : null,
    notes: values.notes,
    externalUrl: isCicloturista ? values.externalUrl : null,
    gpxRouteName: values.gpxRouteName || null,
    gpxFileName: values.gpxFileName || null,
    gpxPath: values.gpxPath || null,
    gpxContent: values.gpxContent || null,
    departureTimeSecondary: hasSecondaryVariant ? values.departureTimeSecondary : null,
    kmsSecondary: hasSecondaryVariant ? Number(values.kmsSecondary) : null,
    elevationGainSecondary: hasSecondaryVariant ? Number(values.elevationGainSecondary) : null,
    gpxRouteNameSecondary: hasSecondaryVariant ? values.gpxRouteNameSecondary || null : null,
    gpxFileNameSecondary: hasSecondaryVariant ? values.gpxFileNameSecondary || null : null,
    gpxPathSecondary: hasSecondaryVariant ? values.gpxPathSecondary || null : null,
    gpxContentSecondary: hasSecondaryVariant ? values.gpxContentSecondary || null : null,
  };

  insertStatement.run(row);
  return toRecord(row);
}

export async function updateRouteTemplate(values: RouteTemplateFormValues) {
  ensureSchema();
  const isCicloturista = values.routeType === "cicloturista";
  const hasSecondaryVariant = isCicloturista && values.gpxRouteNameSecondary.trim().length > 0;
  const existing = values.id
    ? (db.prepare(
      "SELECT gpxRouteName, gpxFileName, gpxPath, gpxContent, gpxRouteNameSecondary, gpxFileNameSecondary, gpxPathSecondary, gpxContentSecondary, meetingPointSecondary, departureTimeSecondary, kmsSecondary, elevationGainSecondary FROM route_templates WHERE id = ? LIMIT 1",
    ).get(values.id) as Pick<
      RouteTemplateRow,
      | "gpxRouteName"
      | "gpxFileName"
      | "gpxPath"
      | "gpxContent"
      | "gpxRouteNameSecondary"
      | "gpxFileNameSecondary"
      | "gpxPathSecondary"
      | "gpxContentSecondary"
      | "meetingPointSecondary"
      | "departureTimeSecondary"
      | "kmsSecondary"
      | "elevationGainSecondary"
    > | undefined)
    : undefined;

  const row: RouteTemplateRow = {
    id: values.id,
    routeType: values.routeType,
    slug: values.slug,
    name: values.name,
    breakfastPlace: isCicloturista ? "Marxa cicloturista" : values.breakfastPlace,
    ...normalizeDepartureTimes(isCicloturista ? [values.departureTimeOne] : [values.departureTimeOne, values.departureTimeTwo].filter(Boolean)),
    distanceToBreakfast: isCicloturista ? 0 : Number(values.distanceToBreakfast),
    elevationToBreakfast: isCicloturista ? 0 : Number(values.elevationToBreakfast),
    kms: Number(values.kms),
    elevationGain: Number(values.elevationGain),
    town: values.town,
    summary: values.summary,
    meetingPoint: values.meetingPoint,
    meetingPointSecondary: hasSecondaryVariant
      ? values.meetingPointSecondary || existing?.meetingPointSecondary || null
      : null,
    notes: values.notes,
    externalUrl: isCicloturista ? values.externalUrl : null,
    gpxRouteName: values.gpxRouteName || existing?.gpxRouteName || null,
    gpxFileName: existing?.gpxFileName ?? null,
    gpxPath: existing?.gpxPath ?? null,
    gpxContent: existing?.gpxContent ?? null,
    departureTimeSecondary: hasSecondaryVariant
      ? values.departureTimeSecondary || existing?.departureTimeSecondary || null
      : null,
    kmsSecondary: hasSecondaryVariant
      ? values.kmsSecondary
        ? Number(values.kmsSecondary)
        : existing?.kmsSecondary ?? null
      : null,
    elevationGainSecondary: hasSecondaryVariant
      ? values.elevationGainSecondary
        ? Number(values.elevationGainSecondary)
        : existing?.elevationGainSecondary ?? null
      : null,
    gpxRouteNameSecondary: hasSecondaryVariant
      ? values.gpxRouteNameSecondary || existing?.gpxRouteNameSecondary || null
      : null,
    gpxFileNameSecondary: hasSecondaryVariant ? existing?.gpxFileNameSecondary ?? null : null,
    gpxPathSecondary: hasSecondaryVariant ? existing?.gpxPathSecondary ?? null : null,
    gpxContentSecondary: hasSecondaryVariant ? existing?.gpxContentSecondary ?? null : null,
  };

  updateStatement.run(row);
  return toRecord(row);
}

export async function deleteRouteTemplate(slug: string) {
  ensureSchema();
  const existing = findBySlugStatement.get(slug) as RouteTemplateRow | undefined;
  if (!existing) {
    return null;
  }

  const previousGpxAbsolutePath = resolveAbsoluteGpxPath(existing.gpxPath);
  const previousGpxAbsolutePathSecondary = resolveAbsoluteGpxPath(existing.gpxPathSecondary);
  db.prepare("DELETE FROM route_templates WHERE slug = ?").run(slug);

  if (previousGpxAbsolutePath) {
    await unlink(previousGpxAbsolutePath).catch(() => undefined);
  }
  if (previousGpxAbsolutePathSecondary) {
    await unlink(previousGpxAbsolutePathSecondary).catch(() => undefined);
  }

  return toRecord(existing);
}

export async function clearRouteTemplates() {
  ensureSchema();
  const rows = db.prepare("SELECT gpxPath, gpxPathSecondary FROM route_templates").all() as Array<{
    gpxPath: string | null;
    gpxPathSecondary: string | null;
  }>;

  db.prepare("DELETE FROM route_templates").run();

  let removedFiles = 0;
  for (const row of rows) {
    const fileA = resolveAbsoluteGpxPath(row.gpxPath);
    const fileB = resolveAbsoluteGpxPath(row.gpxPathSecondary);
    if (fileA) {
      const removed = await unlink(fileA).then(() => true).catch(() => false);
      if (removed) removedFiles += 1;
    }
    if (fileB) {
      const removed = await unlink(fileB).then(() => true).catch(() => false);
      if (removed) removedFiles += 1;
    }
  }

  return {
    deletedRoutes: rows.length,
    removedFiles,
  };
}

export async function seedRouteTemplatesFromCatalog() {
  ensureSchema();
  let inserted = 0;
  let skipped = 0;
  let forcedBreakfastUpdates = 0;

  const runSeed = db.transaction(() => {
    for (const seed of ROUTE_TEMPLATES_CATALOG) {
      const result = insertOrIgnoreStatement.run({
        id: randomUUID(),
        routeType: "ruta",
        slug: seed.slug,
        name: seed.name,
        breakfastPlace: "Per determinar",
        departureTimeOne: "08:00",
        departureTimeTwo: null,
        distanceToBreakfast: seed.distanceToBreakfast,
        elevationToBreakfast: seed.elevationToBreakfast,
        kms: seed.kms,
        elevationGain: seed.elevationGain,
        town: seed.town,
        departureTimeSecondary: null,
        kmsSecondary: null,
        elevationGainSecondary: null,
        summary: seed.summary,
        meetingPoint: "Silvestre",
        meetingPointSecondary: null,
        notes: seed.notes,
        externalUrl: null,
        gpxRouteName: "Recorregut principal",
        gpxFileName: null,
        gpxPath: null,
        gpxContent: null,
        gpxRouteNameSecondary: null,
        gpxFileNameSecondary: null,
        gpxPathSecondary: null,
        gpxContentSecondary: null,
      });
      if (result.changes > 0) {
        inserted += 1;
      } else {
        skipped += 1;
      }

      const forced = forceBreakfastPlaceStatement.run(seed.slug);
      forcedBreakfastUpdates += forced.changes;
    }
  });

  runSeed();

  return {
    totalCatalog: ROUTE_TEMPLATES_CATALOG.length,
    inserted,
    skipped,
    forcedBreakfastUpdates,
  };
}

export async function saveRouteTemplateGpx(
  slug: string,
  file: File,
  slot: "primary" | "secondary" = "primary",
) {
  ensureSchema();
  const existing = findBySlugStatement.get(slug) as RouteTemplateRow | undefined;
  if (!existing) {
    return null;
  }

  mkdirSync(gpxUploadDir, { recursive: true });
  const nextGpxTarget = buildGpxStorageTarget(file.name, slug);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await writeFile(nextGpxTarget.absolutePath, fileBuffer);

  const previousGpxAbsolutePath = resolveAbsoluteGpxPath(
    slot === "secondary" ? existing.gpxPathSecondary : existing.gpxPath,
  );

  if (slot === "secondary") {
    db.prepare(`
      UPDATE route_templates SET
        gpxFileNameSecondary = @gpxFileName,
        gpxPathSecondary = @gpxPath,
        gpxContentSecondary = NULL,
        updatedAt = CURRENT_TIMESTAMP
      WHERE slug = @slug
    `).run({
      slug,
      gpxFileName: file.name,
      gpxPath: nextGpxTarget.publicPath,
    });
  } else {
    db.prepare(`
      UPDATE route_templates SET
        gpxFileName = @gpxFileName,
        gpxPath = @gpxPath,
        gpxContent = NULL,
        updatedAt = CURRENT_TIMESTAMP
      WHERE slug = @slug
    `).run({
      slug,
      gpxFileName: file.name,
      gpxPath: nextGpxTarget.publicPath,
    });
  }

  if (previousGpxAbsolutePath) {
    await unlink(previousGpxAbsolutePath).catch(() => undefined);
  }

  return toRecord({
    ...existing,
    ...(slot === "secondary"
      ? {
        gpxFileNameSecondary: file.name,
        gpxPathSecondary: nextGpxTarget.publicPath,
        gpxContentSecondary: null,
      }
      : {
        gpxFileName: file.name,
        gpxPath: nextGpxTarget.publicPath,
        gpxContent: null,
      }),
  });
}

export async function getRouteTemplateGpxContent(template: {
  gpxPath?: string | null;
  gpxContent?: string | null;
}) {
  const absolutePath = resolveAbsoluteGpxPath(template.gpxPath);
  if (absolutePath) {
    try {
      return await readFile(absolutePath, "utf8");
    } catch {
      return template.gpxContent ?? null;
    }
  }
  return template.gpxContent ?? null;
}

export async function getRouteTemplateSecondaryGpxContent(template: {
  gpxPathSecondary?: string | null;
  gpxContentSecondary?: string | null;
}) {
  const absolutePath = resolveAbsoluteGpxPath(template.gpxPathSecondary);
  if (absolutePath) {
    try {
      return await readFile(absolutePath, "utf8");
    } catch {
      return template.gpxContentSecondary ?? null;
    }
  }
  return template.gpxContentSecondary ?? null;
}

function buildUniqueRouteSlug(baseSlug: string) {
  const trimmedBase = baseSlug.trim().replace(/-base$/i, "");
  const base = trimmedBase.endsWith("-ruta") ? trimmedBase : `${trimmedBase}-ruta`;
  if (!db.prepare("SELECT 1 as ok FROM routes WHERE slug = ? LIMIT 1").get(base)) {
    return base;
  }
  let suffix = 2;
  let candidate = `${base}-${suffix}`;
  while (db.prepare("SELECT 1 as ok FROM routes WHERE slug = ? LIMIT 1").get(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function buildRouteValuesFromTemplate(templateSlug: string): Promise<RouteFormValues | null> {
  const template = await getRouteTemplateBySlug(templateSlug);
  if (!template) {
    return null;
  }

  const normalizedBreakfastPlace = (() => {
    const value = (template.breakfastPlace ?? "").trim();
    if (!value) {
      return "Per determinar";
    }
    if (value.toLocaleLowerCase("ca-ES") === (template.town ?? "").trim().toLocaleLowerCase("ca-ES")) {
      return "Per determinar";
    }
    return value;
  })();

  return {
    id: "",
    originalSlug: "",
    routeType: template.routeType,
    slug: buildUniqueRouteSlug(template.slug),
    name: template.name,
    date: "",
    breakfastPlace: normalizedBreakfastPlace,
    departureTimeOne: template.departureTimeOne,
    departureTimeTwo: template.departureTimeTwo ?? "",
    distanceToBreakfast: String(template.distanceToBreakfast),
    elevationToBreakfast: String(template.elevationToBreakfast),
    kms: String(template.kms),
    elevationGain: String(template.elevationGain),
    town: template.town,
    summary: template.summary,
    meetingPoint: template.meetingPoint,
    meetingPointSecondary: template.meetingPointSecondary ?? "",
    notes: template.notes,
    externalUrl: template.externalUrl ?? "",
    gpxRouteName: template.gpxRouteName ?? "",
    gpxFileName: template.gpxFileName ?? "",
    gpxPath: template.gpxPath ?? "",
    gpxContent: template.gpxContent ?? "",
    departureTimeSecondary: template.departureTimeSecondary ?? "",
    kmsSecondary: template.kmsSecondary !== null ? String(template.kmsSecondary) : "",
    elevationGainSecondary: template.elevationGainSecondary !== null ? String(template.elevationGainSecondary) : "",
    gpxRouteNameSecondary: template.gpxRouteNameSecondary ?? "",
    gpxFileNameSecondary: template.gpxFileNameSecondary ?? "",
    gpxPathSecondary: template.gpxPathSecondary ?? "",
    gpxContentSecondary: template.gpxContentSecondary ?? "",
  };
}
