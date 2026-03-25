export type CyclingRoute = {
  slug: string;
  name: string;
  date: string;
  breakfastPlace: string;
  departureTimes: string[];
  kms: number;
  elevationGain: number;
  town: string;
  summary: string;
  meetingPoint: string;
  notes: string;
};

export type RouteView = "properes" | "passades" | "totes";

export const routes: CyclingRoute[] = [
  {
    slug: "volta-gandia",
    name: "Volta Gandia",
    date: "2026-01-03",
    breakfastPlace: "Pego",
    departureTimes: ["08:00"],
    kms: 98,
    elevationGain: 1200,
    town: "Gandia",
    summary: "Per via servei fins a Marxuquera.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Setla de Nunyés - Gaianes - Beniarrés - Castelló de Rugat - Oliva - Pego - Muro.",
  },
  {
    slug: "benigembla",
    name: "Benigembla",
    date: "2026-01-10",
    breakfastPlace: "Benigembla",
    departureTimes: ["08:00"],
    kms: 106,
    elevationGain: 1600,
    town: "Benigembla",
    summary: "Recorregut per la vall de Pop.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Cocentaina - Millena - Gorga - Balones - Benimassot - Fageca - Famorca - Castell de Castells - Benigembla.",
  },
  {
    slug: "tibi",
    name: "Tibi",
    date: "2026-01-17",
    breakfastPlace: "Tibi",
    departureTimes: ["08:00"],
    kms: 95,
    elevationGain: 1500,
    town: "Tibi",
    summary: "Pel port de la Carrasqueta fins a Tibi.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Cocentaina - Alcoi - Port de la Carrasqueta - Xixona - Tibi - Ibi - Muro.",
  },
  {
    slug: "font-de-la-figuera",
    name: "Font de la Figuera",
    date: "2026-01-24",
    breakfastPlace: "La Font de la Figuera",
    departureTimes: ["08:00"],
    kms: 100,
    elevationGain: 1225,
    town: "La Font de la Figuera",
    summary: "Ruta amb pas per Ontinyent i Fontanars.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Agres - Alfafara - Ontinyent - Font de la Figuera - Fontanars - Muro.",
  },
  {
    slug: "beneixama-pel-moro",
    name: "Beneixama pel Moro",
    date: "2026-01-31",
    breakfastPlace: "Beneixama",
    departureTimes: ["08:00"],
    kms: 107,
    elevationGain: 1400,
    town: "Beneixama",
    summary: "Pel port del Moro fins a Beneixama.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Agres - Alfafara - Ontinyent - Port del Moro - Beneixama - Biar - Muro.",
  },
  {
    slug: "ebo-per-petracos",
    name: "Ebo per Petracos",
    date: "2026-02-07",
    breakfastPlace: "Ebo",
    departureTimes: ["08:00"],
    kms: 95,
    elevationGain: 1600,
    town: "Ebo",
    summary: "Recorregut exigent pel Castell de Castells i Petracos.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Cocentaina - Millena - Balones - Benimassot - Fageca - Famorca - Castell de Castells - Petracos - Ebo.",
  },
  {
    slug: "la-torre-de-les-macanes",
    name: "La Torre de les Maçanes",
    date: "2026-02-21",
    breakfastPlace: "La Torre de les Maçanes",
    departureTimes: ["08:00"],
    kms: 42,
    elevationGain: 950,
    town: "La Torre de les Maçanes",
    summary: "Opció curta amb pas per la Serreta i Benifallim.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Cocentaina - Benilloba - Les Alcoies - Benifallim - Port de Benifallim - La Torre de les Maçanes.",
  },
  {
    slug: "salinas",
    name: "Salinas",
    date: "2026-02-28",
    breakfastPlace: "Salinas",
    departureTimes: ["08:00"],
    kms: 124,
    elevationGain: 900,
    town: "Salinas",
    summary: "Ruta llarga amb tornada per Ibi i Castalla.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Setla de Nunyés - Gaianes - Beniarrés - Castalla - Salinas - Muro.",
  },
  {
    slug: "xativa",
    name: "Xàtiva",
    date: "2026-03-07",
    breakfastPlace: "Xàtiva",
    departureTimes: ["08:00"],
    kms: 108,
    elevationGain: 1500,
    town: "Xàtiva",
    summary: "Ruta cap a la Costera amb retorn per Muro.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Setla de Nunyés - Gaianes - Beniarrés - Castelló de Rugat - Llutxent - Quatretonda - Xàtiva - Muro.",
  },
  {
    slug: "la-font-roja",
    name: "La Font Roja - Venta Sant Jordi",
    date: "2026-03-14",
    breakfastPlace: "La Font dels Patos",
    departureTimes: ["08:00"],
    kms: 100,
    elevationGain: 1700,
    town: "Alcoi",
    summary: "Amb la Font Roja com a eix i retorn per Mariola.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Cocentaina - Port de la Font Roja - La Safranera - La Font dels Patos - Benifallim - Muro.",
  },
  {
    slug: "moixent",
    name: "Moixent",
    date: "2026-03-21",
    breakfastPlace: "Moixent",
    departureTimes: ["08:00"],
    kms: 99,
    elevationGain: 1400,
    town: "Moixent",
    summary: "Per Agres i Fontanars fins a Moixent.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Agres - Alfafara - Fontanars dels Alforins - Moixent - El Bosquet - Ontenyent - Muro.",
  },
  {
    slug: "barx",
    name: "Barx",
    date: "2026-03-28",
    breakfastPlace: "Pla de Corrals",
    departureTimes: ["08:00"],
    kms: 111,
    elevationGain: 1600,
    town: "Barx",
    summary: "Opció amb el Mondúver abans d'esmorzar.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Cocentaina - Benilloba - Benasau - Ares del Bosquet - Confrides - Benimantell - Guadalest - Barx.",
  },
  {
    slug: "caudete",
    name: "Caudete",
    date: "2026-04-04",
    breakfastPlace: "Caudete",
    departureTimes: ["07:45"],
    kms: 116,
    elevationGain: 900,
    town: "Caudete",
    summary: "Amb eixida primerenca i tornada per la Canyada.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Agres - Alfafara - Bocairent - Villena - Caudete - Muro.",
  },
  {
    slug: "penaguila",
    name: "Penàguila",
    date: "2026-04-11",
    breakfastPlace: "Penàguila",
    departureTimes: ["07:30"],
    kms: 100,
    elevationGain: 1530,
    town: "Penàguila",
    summary: "Tudons fent el huit.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Cocentaina - Benilloba - Benasau - Ares - Benifallim - Penàguila - Muro.",
  },
  {
    slug: "pla-de-corrals",
    name: "Pla de Corrals",
    date: "2026-04-18",
    breakfastPlace: "Pla de Corrals",
    departureTimes: ["07:30"],
    kms: 100,
    elevationGain: 1350,
    town: "Pla de Corrals",
    summary: "Ruta ràpida i molt rodadora cap a la Vall d'Albaida.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Benilloba - Benasau - Ares - Benifallim - La Torre de les Maçanes - Pla de Corrals.",
  },
  {
    slug: "forn-per-la-llacuna",
    name: "Forn per la Llacuna",
    date: "2026-04-25",
    breakfastPlace: "Forn de la Llacuna",
    departureTimes: ["07:30"],
    kms: 102,
    elevationGain: 1400,
    town: "La Llacuna",
    summary: "Tancament del calendari amb la Llacuna.",
    meetingPoint: "El Silvestre",
    notes: "Muro - Setla de Nunyés - Gaianes - Beniarrés - L'Orxa - Villalonga - Forn de la Llacuna - Muro.",
  },
];

export function getTodayKey(timeZone = "Europe/Madrid") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

export function formatRouteDate(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function sortRoutesByDate(routeList: CyclingRoute[], direction: "asc" | "desc" = "asc") {
  return [...routeList].sort((left, right) => {
    if (left.date === right.date) {
      return left.name.localeCompare(right.name, "ca");
    }

    return direction === "asc"
      ? left.date.localeCompare(right.date)
      : right.date.localeCompare(left.date);
  });
}

export function splitRoutesByDate(routeList: CyclingRoute[], todayKey: string) {
  const upcoming: CyclingRoute[] = [];
  const past: CyclingRoute[] = [];

  for (const route of routeList) {
    if (route.date >= todayKey) {
      upcoming.push(route);
    } else {
      past.push(route);
    }
  }

  return {
    upcoming: sortRoutesByDate(upcoming, "asc"),
    past: sortRoutesByDate(past, "desc"),
  };
}

export function getRoutesByView(routeList: CyclingRoute[], todayKey: string, view: RouteView) {
  const { upcoming, past } = splitRoutesByDate(routeList, todayKey);

  if (view === "properes") return upcoming;
  if (view === "passades") return past;
  return sortRoutesByDate(routeList, "asc");
}

export function getRouteBySlug(slug: string) {
  return routes.find((route) => route.slug === slug);
}
