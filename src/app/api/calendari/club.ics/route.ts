import { listRoutes } from "@/lib/routes";
import { registerIcsSubscriptionRequest } from "@/lib/calendar-subscriptions";

type ParsedDate = {
  year: number;
  month: number;
  day: number;
};

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line: string) {
  const maxLength = 75;
  if (line.length <= maxLength) {
    return line;
  }

  const parts: string[] = [];
  let cursor = 0;
  while (cursor < line.length) {
    parts.push(line.slice(cursor, cursor + maxLength));
    cursor += maxLength;
  }

  return parts.join("\r\n ");
}

function toUtcStamp(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function parseRouteDate(value: string): ParsedDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseDepartureTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function formatDateOnly(parsedDate: ParsedDate) {
  return `${parsedDate.year}${String(parsedDate.month).padStart(2, "0")}${String(parsedDate.day).padStart(2, "0")}`;
}

function formatDateTimeMadrid(parsedDate: ParsedDate, hour: number, minute: number) {
  const yyyy = String(parsedDate.year);
  const mm = String(parsedDate.month).padStart(2, "0");
  const dd = String(parsedDate.day).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${min}00`;
}

function buildBaseUrl(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

function line(key: string, value: string) {
  return foldIcsLine(`${key}:${escapeIcsText(value)}`);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  registerIcsSubscriptionRequest(request);
  const routes = await listRoutes();
  const nowStamp = toUtcStamp(new Date());
  const baseUrl = buildBaseUrl(request);

  const calendarLines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Club Ciclista La Punxaeta//Calendari de rutes//CA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Club Ciclista La Punxaeta - Rutes",
    "X-WR-TIMEZONE:Europe/Madrid",
    "X-PUBLISHED-TTL:PT15M",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
  ];

  for (const route of routes) {
    const parsedDate = parseRouteDate(route.date);
    if (!parsedDate) {
      continue;
    }

    const firstDeparture = route.departureTimes[0] ?? "";
    const parsedTime = parseDepartureTime(firstDeparture);
    const routeUrl = `${baseUrl}/rutas/${route.slug}`;
    const isCicloturista = route.routeType === "cicloturista";
    const summary = route.name;
    const departureLabel = route.departureTimes.join(" / ");
    const description = [
      isCicloturista ? "Tipus: Marcha Cicloturista" : "Tipus: Ruta del club",
      `Població: ${route.town}`,
      `Punt d'eixida: ${route.meetingPoint}`,
      `Hora eixida: ${departureLabel}`,
      ...(isCicloturista ? [] : [`Lloc d'esmorzar: ${route.breakfastPlace}`]),
      `Km totals: ${route.kms}`,
      `Desnivell total: ${route.elevationGain} m`,
      ...(isCicloturista && route.externalUrl ? [`Web oficial: ${route.externalUrl}`] : []),
      "",
      route.notes,
      "",
      `Més informació: ${routeUrl}`,
    ].join("\n");

    calendarLines.push("BEGIN:VEVENT");
    calendarLines.push(`UID:punxaeta-ruta-${route.slug}@punxaetaweb`);
    calendarLines.push(`DTSTAMP:${nowStamp}`);
    calendarLines.push(line("SUMMARY", summary));
    calendarLines.push(line("DESCRIPTION", description));
    calendarLines.push(line("LOCATION", `${route.meetingPoint}, ${route.town}`));
    calendarLines.push(line("URL", routeUrl));
    calendarLines.push("STATUS:CONFIRMED");
    calendarLines.push(`CATEGORIES:${isCicloturista ? "MARCHA-CICLOTURISTA" : "RUTA"}`);

    if (parsedTime) {
      calendarLines.push(
        `DTSTART;TZID=Europe/Madrid:${formatDateTimeMadrid(parsedDate, parsedTime.hour, parsedTime.minute)}`,
      );
      calendarLines.push(
        `DTEND;TZID=Europe/Madrid:${formatDateTimeMadrid(parsedDate, 13, 0)}`,
      );
    } else {
      calendarLines.push(`DTSTART;VALUE=DATE:${formatDateOnly(parsedDate)}`);
    }

    calendarLines.push("END:VEVENT");
  }

  calendarLines.push("END:VCALENDAR");

  const body = `${calendarLines.join("\r\n")}\r\n`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="punxaeta-rutes.ics"',
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
