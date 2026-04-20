import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { db } from "@/lib/database";
import { resolveMediaUploadDir } from "@/lib/media-storage";
import {
  formatRouteDate,
  getTodayKey,
  routes as seedRoutes,
  sortRoutesByDate,
  splitRoutesByDate,
  type CyclingRoute,
  type RouteView,
} from "@/data/routes";

export type RouteRecord = Omit<CyclingRoute, "distanceToBreakfast" | "elevationToBreakfast"> & {
  id: string;
  routeType: "ruta" | "cicloturista";
  externalUrl: string | null;
  distanceToBreakfast: number;
  elevationToBreakfast: number;
  meetingPointSecondary: string | null;
  departureTimeSecondary: string | null;
  kmsSecondary: number | null;
  elevationGainSecondary: number | null;
  gpxRouteName: string | null;
  gpxFileName: string | null;
  gpxPath: string | null;
  gpxContent: string | null;
  gpxRouteNameSecondary: string | null;
  gpxFileNameSecondary: string | null;
  gpxPathSecondary: string | null;
  gpxContentSecondary: string | null;
};

export type RouteFormValues = {
  id: string;
  originalSlug: string;
  routeType: "ruta" | "cicloturista";
  slug: string;
  name: string;
  date: string;
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

export type RouteFormState = {
  values: RouteFormValues;
  errors: Partial<Record<keyof RouteFormValues, string>>;
  formError?: string;
};

type RouteRow = {
  id: string;
  routeType: "ruta" | "cicloturista";
  slug: string;
  name: string;
  date: string;
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

const createTableStatement = db.prepare(`
  CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    routeType TEXT NOT NULL DEFAULT 'ruta',
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
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
  const columns = db.prepare("PRAGMA table_info(routes)").all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === name)) {
    return;
  }

  db.exec(`ALTER TABLE routes ADD COLUMN ${definition}`);
}

const listRoutesStatement = db.prepare(
  "SELECT id, routeType, slug, name, date, breakfastPlace, departureTimeOne, departureTimeTwo, distanceToBreakfast, elevationToBreakfast, kms, elevationGain, town, summary, meetingPoint, meetingPointSecondary, notes, externalUrl, gpxRouteName, gpxFileName, gpxPath, gpxContent, departureTimeSecondary, kmsSecondary, elevationGainSecondary, gpxRouteNameSecondary, gpxFileNameSecondary, gpxPathSecondary, gpxContentSecondary FROM routes ORDER BY date ASC, name ASC",
);
const countRoutesStatement = db.prepare("SELECT COUNT(*) as count FROM routes");
const findRouteStatement = db.prepare(
  "SELECT id, routeType, slug, name, date, breakfastPlace, departureTimeOne, departureTimeTwo, distanceToBreakfast, elevationToBreakfast, kms, elevationGain, town, summary, meetingPoint, meetingPointSecondary, notes, externalUrl, gpxRouteName, gpxFileName, gpxPath, gpxContent, departureTimeSecondary, kmsSecondary, elevationGainSecondary, gpxRouteNameSecondary, gpxFileNameSecondary, gpxPathSecondary, gpxContentSecondary FROM routes WHERE slug = ? LIMIT 1",
);
const insertRouteStatement = db.prepare(`
  INSERT INTO routes (
    id, routeType, slug, name, date, breakfastPlace, departureTimeOne, departureTimeTwo,
    distanceToBreakfast, elevationToBreakfast, kms, elevationGain, town, departureTimeSecondary,
    kmsSecondary, elevationGainSecondary,
    summary, meetingPoint, meetingPointSecondary, notes, externalUrl, gpxRouteName, gpxFileName, gpxPath, gpxContent,
    gpxRouteNameSecondary, gpxFileNameSecondary, gpxPathSecondary, gpxContentSecondary
  ) VALUES (
    @id, @routeType, @slug, @name, @date, @breakfastPlace, @departureTimeOne, @departureTimeTwo,
    @distanceToBreakfast, @elevationToBreakfast, @kms, @elevationGain, @town, @departureTimeSecondary,
    @kmsSecondary, @elevationGainSecondary,
    @summary, @meetingPoint, @meetingPointSecondary, @notes, @externalUrl, @gpxRouteName, @gpxFileName, @gpxPath, @gpxContent,
    @gpxRouteNameSecondary, @gpxFileNameSecondary, @gpxPathSecondary, @gpxContentSecondary
  )
`);
const seedInsertRouteStatement = db.prepare(`
  INSERT OR IGNORE INTO routes (
    id, routeType, slug, name, date, breakfastPlace, departureTimeOne, departureTimeTwo,
    distanceToBreakfast, elevationToBreakfast, kms, elevationGain, town, departureTimeSecondary,
    kmsSecondary, elevationGainSecondary,
    summary, meetingPoint, meetingPointSecondary, notes, externalUrl, gpxRouteName, gpxFileName, gpxPath, gpxContent,
    gpxRouteNameSecondary, gpxFileNameSecondary, gpxPathSecondary, gpxContentSecondary
  ) VALUES (
    @id, @routeType, @slug, @name, @date, @breakfastPlace, @departureTimeOne, @departureTimeTwo,
    @distanceToBreakfast, @elevationToBreakfast, @kms, @elevationGain, @town, @departureTimeSecondary,
    @kmsSecondary, @elevationGainSecondary,
    @summary, @meetingPoint, @meetingPointSecondary, @notes, @externalUrl, @gpxRouteName, @gpxFileName, @gpxPath, @gpxContent,
    @gpxRouteNameSecondary, @gpxFileNameSecondary, @gpxPathSecondary, @gpxContentSecondary
  )
`);
const updateRouteStatement = db.prepare(`
  UPDATE routes SET
    routeType = @routeType,
    slug = @slug,
    name = @name,
    date = @date,
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

const seedRoutesTransaction = db.transaction((rows: RouteRow[]) => {
  for (const row of rows) {
    seedInsertRouteStatement.run(row);
  }
});

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

const gpxUploadDir = resolveMediaUploadDir("gpx");
const gpxPublicPrefix = "/gpx/uploads/";

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function buildGpxStorageTarget(originalFileName: string, slug: string) {
  const extension = extname(originalFileName).toLowerCase() || ".gpx";
  const normalizedExtension = extension === ".xml" ? ".gpx" : extension;
  const safeSlug = sanitizeFileName(slug) || "ruta";
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

function seedRoutesIfNeeded() {
  ensureSchema();
  const existingRoutes = countRoutesStatement.get() as { count: number };

  if (existingRoutes.count > 0) {
    return;
  }

  seedRoutesTransaction(
    seedRoutes.map((route) => ({
      id: randomUUID(),
      routeType: route.routeType ?? "ruta",
      slug: route.slug,
      name: route.name,
      date: route.date,
      breakfastPlace: route.breakfastPlace,
      departureTimeOne: route.departureTimes[0] ?? "",
      departureTimeTwo: route.departureTimes[1] ?? null,
      distanceToBreakfast: route.distanceToBreakfast ?? 0,
      elevationToBreakfast: route.elevationToBreakfast ?? 0,
      kms: route.kms,
      elevationGain: route.elevationGain,
      town: route.town,
      summary: route.summary,
      meetingPoint: route.meetingPoint,
      meetingPointSecondary: null,
      notes: route.notes,
      externalUrl: route.externalUrl ?? null,
      gpxRouteName: null,
      gpxFileName: route.gpxFileName ?? null,
      gpxPath: route.gpxPath ?? null,
      gpxContent: route.gpxContent ?? null,
      departureTimeSecondary: null,
      kmsSecondary: null,
      elevationGainSecondary: null,
      gpxRouteNameSecondary: null,
      gpxFileNameSecondary: null,
      gpxPathSecondary: null,
      gpxContentSecondary: null,
    })),
  );
}

function toRouteRecord(route: RouteRow): RouteRecord {
  const departureTimes = [route.departureTimeOne, route.departureTimeTwo].filter(
    Boolean,
  ) as string[];

  return {
    id: route.id,
    routeType: route.routeType ?? "ruta",
    slug: route.slug,
    name: route.name,
    date: route.date,
    breakfastPlace: route.breakfastPlace,
    departureTimes,
    distanceToBreakfast: route.distanceToBreakfast,
    elevationToBreakfast: route.elevationToBreakfast,
    kms: route.kms,
    elevationGain: route.elevationGain,
    town: route.town,
    summary: route.summary,
    meetingPoint: route.meetingPoint,
    meetingPointSecondary: route.meetingPointSecondary,
    notes: route.notes,
    externalUrl: route.externalUrl,
    gpxRouteName: route.gpxRouteName,
    gpxFileName: route.gpxFileName,
    gpxPath: route.gpxPath,
    gpxContent: route.gpxContent,
    departureTimeSecondary: route.departureTimeSecondary,
    kmsSecondary: route.kmsSecondary,
    elevationGainSecondary: route.elevationGainSecondary,
    gpxRouteNameSecondary: route.gpxRouteNameSecondary,
    gpxFileNameSecondary: route.gpxFileNameSecondary,
    gpxPathSecondary: route.gpxPathSecondary,
    gpxContentSecondary: route.gpxContentSecondary,
  };
}

function toDbDate(date: string) {
  return date;
}

function normalizeDepartureTimes(departureTimes: string[]) {
  const [first = "", second = ""] = departureTimes;
  return {
    departureTimeOne: first,
    departureTimeTwo: second || null,
  };
}

export const emptyRouteValues = (): RouteFormValues => ({
  id: "",
  originalSlug: "",
  routeType: "ruta",
  slug: "",
  name: "",
  date: "",
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

export async function listRoutes() {
  seedRoutesIfNeeded();
  const records = listRoutesStatement.all() as RouteRow[];
  return records.map(toRouteRecord);
}

export async function getRouteBySlug(slug: string) {
  seedRoutesIfNeeded();
  const record = findRouteStatement.get(slug) as RouteRow | undefined;
  return record ? toRouteRecord(record) : null;
}

export async function getRoutesByView(view: RouteView, todayKey: string) {
  const allRoutes = await listRoutes();
  const { upcoming, past } = splitRoutesByDate(allRoutes, todayKey);

  if (view === "properes") {
    return upcoming;
  }

  if (view === "passades") {
    return past;
  }

  return sortRoutesByDate(allRoutes, "asc");
}

export async function getUpcomingRoutes(todayKey: string, limit = 3) {
  const routes = await listRoutes();
  const { upcoming } = splitRoutesByDate(routes, todayKey);
  return upcoming.slice(0, limit);
}

function buildRouteErrors(values: RouteFormValues) {
  const errors: Partial<Record<keyof RouteFormValues, string>> = {};
  const isCicloturista = values.routeType === "cicloturista";

  if (values.routeType !== "ruta" && values.routeType !== "cicloturista") {
    errors.routeType = "Tipus de ruta no vàlid.";
  }
  if (!values.slug.trim()) errors.slug = "Cal un slug.";
  if (!values.name.trim()) errors.name = "Cal un nom.";
  if (!values.date.trim()) errors.date = "Cal una data.";
  if (!values.departureTimeOne.trim()) errors.departureTimeOne = "Cal com a mínim una hora d'eixida.";
  if (!values.kms.trim()) errors.kms = "Cal indicar els quilòmetres.";
  if (!values.elevationGain.trim()) errors.elevationGain = "Cal indicar el desnivell.";
  if (!values.town.trim()) errors.town = "Cal indicar la població.";
  if (!values.meetingPoint.trim()) errors.meetingPoint = "Cal un punt de trobada.";
  if (!isCicloturista && !values.notes.trim()) errors.notes = "Cal un recorregut.";
  if (!values.gpxRouteName.trim()) {
    errors.gpxRouteName = "Cal indicar un nom per al recorregut principal.";
  }
  if (!isCicloturista && !values.breakfastPlace.trim()) {
    errors.breakfastPlace = "Cal un lloc d'esmorzar.";
  }
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
      if (!values.kmsSecondary.trim()) {
        errors.kmsSecondary = "Cal indicar els quilòmetres del segon recorregut.";
      }
      if (!values.elevationGainSecondary.trim()) {
        errors.elevationGainSecondary = "Cal indicar el desnivell del segon recorregut.";
      }
    }
  }

  return errors;
}

function buildRouteSummary(notes: string) {
  const normalized = notes.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized.length > 180 ? `${normalized.slice(0, 177).trimEnd()}...` : normalized;
}

function normalizeRouteName(value: string) {
  return value.replace(/^nom\s+recorregut\s*[12]\s*:\s*/i, "").trim();
}

export function routeToFormValues(route: RouteRecord): RouteFormValues {
  return {
    id: route.id,
    originalSlug: route.slug,
    routeType: route.routeType,
    slug: route.slug,
    name: route.name,
    date: route.date,
    breakfastPlace: route.breakfastPlace,
    departureTimeOne: route.departureTimes[0] ?? "",
    departureTimeTwo: route.departureTimes[1] ?? "",
    distanceToBreakfast: String(route.distanceToBreakfast),
    elevationToBreakfast: String(route.elevationToBreakfast),
    kms: String(route.kms),
    elevationGain: String(route.elevationGain),
    town: route.town,
    summary: route.summary,
    meetingPoint: route.meetingPoint,
    meetingPointSecondary: route.meetingPointSecondary ?? "",
    notes: route.notes,
    externalUrl: route.externalUrl ?? "",
    gpxRouteName: route.gpxRouteName ?? "",
    gpxFileName: route.gpxFileName ?? "",
    gpxPath: route.gpxPath ?? "",
    gpxContent: route.gpxContent ?? "",
    departureTimeSecondary: route.departureTimeSecondary ?? "",
    kmsSecondary: route.kmsSecondary !== null ? String(route.kmsSecondary) : "",
    elevationGainSecondary:
      route.elevationGainSecondary !== null ? String(route.elevationGainSecondary) : "",
    gpxRouteNameSecondary: route.gpxRouteNameSecondary ?? "",
    gpxFileNameSecondary: route.gpxFileNameSecondary ?? "",
    gpxPathSecondary: route.gpxPathSecondary ?? "",
    gpxContentSecondary: route.gpxContentSecondary ?? "",
  };
}

function buildUniqueDuplicateSlug(baseSlug: string, takenSlugs: Set<string>) {
  const trimmedBaseSlug = baseSlug.trim();
  const duplicateBase = trimmedBaseSlug.endsWith("-copia")
    ? trimmedBaseSlug
    : `${trimmedBaseSlug}-copia`;

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

export async function buildDuplicateRouteValues(slug: string) {
  const route = await getRouteBySlug(slug);
  if (!route) {
    return null;
  }

  const existingRoutes = await listRoutes();
  const takenSlugs = new Set(existingRoutes.map((item) => item.slug));
  const duplicatedSlug = buildUniqueDuplicateSlug(route.slug, takenSlugs);

  return {
    ...routeToFormValues(route),
    id: "",
    originalSlug: "",
    slug: duplicatedSlug,
    date: "",
  };
}

export function parseRouteFormData(formData: FormData): RouteFormState {
  const notes = String(formData.get("notes") ?? "").trim();
  const gpxContent = String(formData.get("gpxContent") ?? "");
  const gpxContentSecondary = String(formData.get("gpxContentSecondary") ?? "");
  const isCicloturista =
    String(formData.get("routeType") ?? "ruta").trim() === "cicloturista";
  const gpxRouteName = normalizeRouteName(String(formData.get("gpxRouteName") ?? "").trim());
  const gpxRouteNameSecondary = normalizeRouteName(String(formData.get("gpxRouteNameSecondary") ?? "").trim());
  const values: RouteFormValues = {
    id: String(formData.get("id") ?? ""),
    originalSlug: String(formData.get("originalSlug") ?? ""),
    routeType: isCicloturista ? "cicloturista" : "ruta",
    slug: String(formData.get("slug") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    date: String(formData.get("date") ?? ""),
    breakfastPlace: String(formData.get("breakfastPlace") ?? "").trim(),
    departureTimeOne: String(formData.get("departureTimeOne") ?? "").trim(),
    departureTimeTwo: String(formData.get("departureTimeTwo") ?? "").trim(),
    distanceToBreakfast: String(formData.get("distanceToBreakfast") ?? "").trim(),
    elevationToBreakfast: String(formData.get("elevationToBreakfast") ?? "").trim(),
    kms: String(formData.get("kms") ?? "").trim(),
    elevationGain: String(formData.get("elevationGain") ?? "").trim(),
    town: String(formData.get("town") ?? "").trim(),
    summary: buildRouteSummary(notes),
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

  const errors = buildRouteErrors(values);
  if (Object.keys(errors).length > 0) {
    return { values, errors };
  }

  return { values, errors: {} };
}

export async function createRoute(values: RouteFormValues) {
  seedRoutesIfNeeded();
  const isCicloturista = values.routeType === "cicloturista";
  const hasSecondaryVariant = isCicloturista && values.gpxRouteNameSecondary.trim().length > 0;
  const row: RouteRow = {
    id: randomUUID(),
    routeType: values.routeType,
    slug: values.slug,
    name: values.name,
    date: toDbDate(values.date),
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

  insertRouteStatement.run(row);
  return toRouteRecord(row);
}

export async function updateRoute(values: RouteFormValues) {
  seedRoutesIfNeeded();
  const isCicloturista = values.routeType === "cicloturista";
  const hasSecondaryVariant = isCicloturista && values.gpxRouteNameSecondary.trim().length > 0;
  const existing = values.id
      ? (db.prepare(
        "SELECT gpxRouteName, gpxFileName, gpxPath, gpxContent, gpxRouteNameSecondary, gpxFileNameSecondary, gpxPathSecondary, gpxContentSecondary, meetingPointSecondary, departureTimeSecondary, kmsSecondary, elevationGainSecondary FROM routes WHERE id = ? LIMIT 1",
      ).get(values.id) as Pick<
        RouteRow,
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
  const row: RouteRow = {
    id: values.id,
    routeType: values.routeType,
    slug: values.slug,
    name: values.name,
    date: toDbDate(values.date),
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

  updateRouteStatement.run(row);
  return toRouteRecord(row);
}

export async function deleteRoute(slug: string) {
  seedRoutesIfNeeded();
  const existing = findRouteStatement.get(slug) as RouteRow | undefined;
  if (!existing) {
    return null;
  }

  const previousGpxAbsolutePath = resolveAbsoluteGpxPath(existing.gpxPath);
  const previousGpxAbsolutePathSecondary = resolveAbsoluteGpxPath(existing.gpxPathSecondary);
  db.prepare("DELETE FROM routes WHERE slug = ?").run(slug);

  if (previousGpxAbsolutePath) {
    await unlink(previousGpxAbsolutePath).catch(() => undefined);
  }
  if (previousGpxAbsolutePathSecondary) {
    await unlink(previousGpxAbsolutePathSecondary).catch(() => undefined);
  }

  return toRouteRecord(existing);
}

export async function saveRouteGpx(slug: string, file: File, slot: "primary" | "secondary" = "primary") {
  seedRoutesIfNeeded();
  const existing = findRouteStatement.get(slug) as RouteRow | undefined;

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
      UPDATE routes SET
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
      UPDATE routes SET
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

  return toRouteRecord({
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

export async function getRouteGpxContent(route: { gpxPath?: string | null; gpxContent?: string | null }) {
  const absolutePath = resolveAbsoluteGpxPath(route.gpxPath);
  if (absolutePath) {
    try {
      return await readFile(absolutePath, "utf8");
    } catch {
      return route.gpxContent ?? null;
    }
  }

  return route.gpxContent ?? null;
}

export async function getRouteSecondaryGpxContent(route: {
  gpxPathSecondary?: string | null;
  gpxContentSecondary?: string | null;
}) {
  const absolutePath = resolveAbsoluteGpxPath(route.gpxPathSecondary);
  if (absolutePath) {
    try {
      return await readFile(absolutePath, "utf8");
    } catch {
      return route.gpxContentSecondary ?? null;
    }
  }

  return route.gpxContentSecondary ?? null;
}

export function buildDateLabel(date: string) {
  return formatRouteDate(date);
}

export { getTodayKey };
export type { RouteView };
