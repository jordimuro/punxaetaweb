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

export type RouteRecord = CyclingRoute & {
  id: string;
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
  kms: number;
  elevationGain: number;
  town: string;
  summary: string;
  meetingPoint: string;
  notes: string;
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
    kms INTEGER NOT NULL,
    elevationGain INTEGER NOT NULL,
    town TEXT NOT NULL,
    summary TEXT NOT NULL,
    meetingPoint TEXT NOT NULL,
    notes TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

createTableStatement.run();

const listRoutesStatement = db.prepare(
  "SELECT id, slug, name, date, breakfastPlace, departureTimeOne, departureTimeTwo, kms, elevationGain, town, summary, meetingPoint, notes FROM routes ORDER BY date ASC, name ASC",
);
const findRouteStatement = db.prepare(
  "SELECT id, slug, name, date, breakfastPlace, departureTimeOne, departureTimeTwo, kms, elevationGain, town, summary, meetingPoint, notes FROM routes WHERE slug = ? LIMIT 1",
);
const insertRouteStatement = db.prepare(`
  INSERT INTO routes (
    id, slug, name, date, breakfastPlace, departureTimeOne, departureTimeTwo,
    kms, elevationGain, town, summary, meetingPoint, notes
  ) VALUES (
    @id, @slug, @name, @date, @breakfastPlace, @departureTimeOne, @departureTimeTwo,
    @kms, @elevationGain, @town, @summary, @meetingPoint, @notes
  )
`);
const seedInsertRouteStatement = db.prepare(`
  INSERT OR IGNORE INTO routes (
    id, slug, name, date, breakfastPlace, departureTimeOne, departureTimeTwo,
    kms, elevationGain, town, summary, meetingPoint, notes
  ) VALUES (
    @id, @slug, @name, @date, @breakfastPlace, @departureTimeOne, @departureTimeTwo,
    @kms, @elevationGain, @town, @summary, @meetingPoint, @notes
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
    kms = @kms,
    elevationGain = @elevationGain,
    town = @town,
    summary = @summary,
    meetingPoint = @meetingPoint,
    notes = @notes,
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
}

function seedRoutesIfNeeded() {
  ensureSchema();
  seedRoutesTransaction(
    seedRoutes.map((route) => ({
      id: randomUUID(),
      slug: route.slug,
      name: route.name,
      date: route.date,
      breakfastPlace: route.breakfastPlace,
      departureTimeOne: route.departureTimes[0] ?? "",
      departureTimeTwo: route.departureTimes[1] ?? null,
      kms: route.kms,
      elevationGain: route.elevationGain,
      town: route.town,
      summary: route.summary,
      meetingPoint: route.meetingPoint,
      notes: route.notes,
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
    kms: route.kms,
    elevationGain: route.elevationGain,
    town: route.town,
    summary: route.summary,
    meetingPoint: route.meetingPoint,
    notes: route.notes,
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
    kms: Number(values.kms),
    elevationGain: Number(values.elevationGain),
    town: values.town,
    summary: values.summary,
    meetingPoint: values.meetingPoint,
    notes: values.notes,
  };

  insertRouteStatement.run(row);
  return toRouteRecord(row);
}

export async function updateRoute(values: RouteFormValues) {
  seedRoutesIfNeeded();
  const row: RouteRow = {
    id: values.id,
    slug: values.slug,
    name: values.name,
    date: toDbDate(values.date),
    breakfastPlace: values.breakfastPlace,
    ...normalizeDepartureTimes([values.departureTimeOne, values.departureTimeTwo].filter(Boolean)),
    kms: Number(values.kms),
    elevationGain: Number(values.elevationGain),
    town: values.town,
    summary: values.summary,
    meetingPoint: values.meetingPoint,
    notes: values.notes,
  };

  updateRouteStatement.run(row);
  return toRouteRecord(row);
}

export function buildDateLabel(date: string) {
  return formatRouteDate(date);
}

export { getTodayKey };
export type { RouteView };
