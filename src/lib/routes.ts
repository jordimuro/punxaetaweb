import "server-only";

import { randomUUID } from "node:crypto";
import { db } from "@/lib/database";
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
  distanceToBreakfast: number;
  elevationToBreakfast: number;
};

export type RouteFormValues = {
  id: string;
  originalSlug: string;
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
  notes: string;
};

export type RouteFormState = {
  values: RouteFormValues;
  errors: Partial<Record<keyof RouteFormValues, string>>;
  formError?: string;
};

type RouteRow = {
  id: string;
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
  notes: string;
  gpxFileName: string | null;
  gpxContent: string | null;
};

const createTableStatement = db.prepare(`
  CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
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
    notes TEXT NOT NULL,
    gpxFileName TEXT,
    gpxContent TEXT,
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

ensureSchema();

const listRoutesStatement = db.prepare(
  "SELECT id, slug, name, date, breakfastPlace, departureTimeOne, departureTimeTwo, distanceToBreakfast, elevationToBreakfast, kms, elevationGain, town, summary, meetingPoint, notes, gpxFileName, gpxContent FROM routes ORDER BY date ASC, name ASC",
);
const countRoutesStatement = db.prepare("SELECT COUNT(*) as count FROM routes");
const findRouteStatement = db.prepare(
  "SELECT id, slug, name, date, breakfastPlace, departureTimeOne, departureTimeTwo, distanceToBreakfast, elevationToBreakfast, kms, elevationGain, town, summary, meetingPoint, notes, gpxFileName, gpxContent FROM routes WHERE slug = ? LIMIT 1",
);
const insertRouteStatement = db.prepare(`
  INSERT INTO routes (
    id, slug, name, date, breakfastPlace, departureTimeOne, departureTimeTwo,
    distanceToBreakfast, elevationToBreakfast, kms, elevationGain, town,
    summary, meetingPoint, notes, gpxFileName, gpxContent
  ) VALUES (
    @id, @slug, @name, @date, @breakfastPlace, @departureTimeOne, @departureTimeTwo,
    @distanceToBreakfast, @elevationToBreakfast, @kms, @elevationGain, @town,
    @summary, @meetingPoint, @notes, @gpxFileName, @gpxContent
  )
`);
const seedInsertRouteStatement = db.prepare(`
  INSERT OR IGNORE INTO routes (
    id, slug, name, date, breakfastPlace, departureTimeOne, departureTimeTwo,
    distanceToBreakfast, elevationToBreakfast, kms, elevationGain, town,
    summary, meetingPoint, notes, gpxFileName, gpxContent
  ) VALUES (
    @id, @slug, @name, @date, @breakfastPlace, @departureTimeOne, @departureTimeTwo,
    @distanceToBreakfast, @elevationToBreakfast, @kms, @elevationGain, @town,
    @summary, @meetingPoint, @notes, @gpxFileName, @gpxContent
  )
`);
const updateRouteStatement = db.prepare(`
  UPDATE routes SET
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
    town = @town,
    summary = @summary,
    meetingPoint = @meetingPoint,
    notes = @notes,
    gpxFileName = @gpxFileName,
    gpxContent = @gpxContent,
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
  ensureColumn("distanceToBreakfast", "distanceToBreakfast INTEGER NOT NULL DEFAULT 0");
  ensureColumn("elevationToBreakfast", "elevationToBreakfast INTEGER NOT NULL DEFAULT 0");
  ensureColumn("gpxFileName", "gpxFileName TEXT");
  ensureColumn("gpxContent", "gpxContent TEXT");
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
      notes: route.notes,
      gpxFileName: route.gpxFileName ?? null,
      gpxContent: route.gpxContent ?? null,
    })),
  );
}

function toRouteRecord(route: RouteRow): RouteRecord {
  const departureTimes = [route.departureTimeOne, route.departureTimeTwo].filter(
    Boolean,
  ) as string[];

  return {
    id: route.id,
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
    notes: route.notes,
    gpxFileName: route.gpxFileName,
    gpxContent: route.gpxContent,
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
  notes: "",
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

  if (!values.slug.trim()) errors.slug = "Cal un slug.";
  if (!values.name.trim()) errors.name = "Cal un nom.";
  if (!values.date.trim()) errors.date = "Cal una data.";
  if (!values.breakfastPlace.trim()) errors.breakfastPlace = "Cal un lloc d'esmorzar.";
  if (!values.departureTimeOne.trim()) errors.departureTimeOne = "Cal com a mínim una hora d'eixida.";
  if (!values.distanceToBreakfast.trim()) errors.distanceToBreakfast = "Cal indicar la distància fins a esmorzar.";
  if (!values.elevationToBreakfast.trim()) errors.elevationToBreakfast = "Cal indicar el desnivell fins a esmorzar.";
  if (!values.kms.trim()) errors.kms = "Cal indicar els quilòmetres.";
  if (!values.elevationGain.trim()) errors.elevationGain = "Cal indicar el desnivell.";
  if (!values.town.trim()) errors.town = "Cal indicar la població.";
  if (!values.summary.trim()) errors.summary = "Cal un resum.";
  if (!values.meetingPoint.trim()) errors.meetingPoint = "Cal un punt de trobada.";
  if (!values.notes.trim()) errors.notes = "Calen notes de ruta.";

  return errors;
}

export function routeToFormValues(route: RouteRecord): RouteFormValues {
  return {
    id: route.id,
    originalSlug: route.slug,
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
    notes: route.notes,
  };
}

export function parseRouteFormData(formData: FormData): RouteFormState {
  const values: RouteFormValues = {
    id: String(formData.get("id") ?? ""),
    originalSlug: String(formData.get("originalSlug") ?? ""),
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
    summary: String(formData.get("summary") ?? "").trim(),
    meetingPoint: String(formData.get("meetingPoint") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };

  const errors = buildRouteErrors(values);
  if (Object.keys(errors).length > 0) {
    return { values, errors };
  }

  return { values, errors: {} };
}

export async function createRoute(values: RouteFormValues) {
  seedRoutesIfNeeded();
  const row: RouteRow = {
    id: randomUUID(),
    slug: values.slug,
    name: values.name,
    date: toDbDate(values.date),
    breakfastPlace: values.breakfastPlace,
    ...normalizeDepartureTimes([values.departureTimeOne, values.departureTimeTwo].filter(Boolean)),
    distanceToBreakfast: Number(values.distanceToBreakfast),
    elevationToBreakfast: Number(values.elevationToBreakfast),
    kms: Number(values.kms),
    elevationGain: Number(values.elevationGain),
    town: values.town,
    summary: values.summary,
    meetingPoint: values.meetingPoint,
    notes: values.notes,
    gpxFileName: null,
    gpxContent: null,
  };

  insertRouteStatement.run(row);
  return toRouteRecord(row);
}

export async function updateRoute(values: RouteFormValues) {
  seedRoutesIfNeeded();
  const existing = values.id
    ? (db.prepare(
        "SELECT gpxFileName, gpxContent FROM routes WHERE id = ? LIMIT 1",
      ).get(values.id) as Pick<RouteRow, "gpxFileName" | "gpxContent"> | undefined)
    : undefined;
  const row: RouteRow = {
    id: values.id,
    slug: values.slug,
    name: values.name,
    date: toDbDate(values.date),
    breakfastPlace: values.breakfastPlace,
    ...normalizeDepartureTimes([values.departureTimeOne, values.departureTimeTwo].filter(Boolean)),
    distanceToBreakfast: Number(values.distanceToBreakfast),
    elevationToBreakfast: Number(values.elevationToBreakfast),
    kms: Number(values.kms),
    elevationGain: Number(values.elevationGain),
    town: values.town,
    summary: values.summary,
    meetingPoint: values.meetingPoint,
    notes: values.notes,
    gpxFileName: existing?.gpxFileName ?? null,
    gpxContent: existing?.gpxContent ?? null,
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

  db.prepare("DELETE FROM routes WHERE slug = ?").run(slug);
  return toRouteRecord(existing);
}

export async function saveRouteGpx(slug: string, file: File) {
  seedRoutesIfNeeded();
  const existing = findRouteStatement.get(slug) as RouteRow | undefined;

  if (!existing) {
    return null;
  }

  const gpxContent = await file.text();
  const updateGpxStatement = db.prepare(`
    UPDATE routes SET
      gpxFileName = @gpxFileName,
      gpxContent = @gpxContent,
      updatedAt = CURRENT_TIMESTAMP
    WHERE slug = @slug
  `);

  updateGpxStatement.run({
    slug,
    gpxFileName: file.name,
    gpxContent,
  });

  return toRouteRecord({
    ...existing,
    gpxFileName: file.name,
    gpxContent,
  });
}

export function buildDateLabel(date: string) {
  return formatRouteDate(date);
}

export { getTodayKey };
export type { RouteView };
