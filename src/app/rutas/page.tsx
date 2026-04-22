import Link from "next/link";
import { AuthOnly } from "@/components/auth";
import {
  buildDateLabel,
  getRoutesByView,
  getTodayKey,
  type RouteView,
} from "@/lib/routes";

export const dynamic = "force-dynamic";

type RoutesPageProps = {
  searchParams: Promise<{ vista?: string; q?: string; any?: string }>;
};

const filterLabels: Record<RouteView, string> = {
  properes: "Properes",
  passades: "Passades",
  totes: "Totes",
};

function resolveView(rawView?: string): RouteView {
  if (rawView === "passades" || rawView === "totes") {
    return rawView;
  }

  return "properes";
}

function resolveYearFilter(rawYear?: string) {
  const year = String(rawYear ?? "").trim();
  if (/^\d{4}$/.test(year)) {
    return year;
  }

  return "tots";
}

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("ca-ES")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function routeMatchesQuery(
  route: {
    routeType?: "ruta" | "cicloturista";
    name: string;
    town: string;
    breakfastPlace: string;
    meetingPoint: string;
    notes: string;
    externalUrl?: string | null;
    slug: string;
  },
  query: string,
) {
  if (!query) {
    return true;
  }

  const queryNormalized = normalizeSearchText(query);
  const searchable = [
    route.name,
    route.town,
    route.breakfastPlace,
    route.meetingPoint,
    route.notes,
    route.routeType ?? "ruta",
    route.externalUrl ?? "",
    route.slug,
  ]
    .map(normalizeSearchText)
    .join(" ");

  return searchable.includes(queryNormalized);
}

function buildRoutesHref(params: { view: RouteView; query: string; yearFilter: string }) {
  const search = new URLSearchParams();

  if (params.view !== "properes") {
    search.set("vista", params.view);
  }

  if (params.query) {
    search.set("q", params.query);
  }

  if (params.yearFilter !== "tots") {
    search.set("any", params.yearFilter);
  }

  const queryString = search.toString();
  return queryString ? `/rutas?${queryString}` : "/rutas";
}

export default async function RoutesPage({ searchParams }: RoutesPageProps) {
  const searchParamsResolved = await searchParams;
  const view = resolveView(searchParamsResolved?.vista);
  const query = String(searchParamsResolved?.q ?? "").trim();
  const yearFilter = resolveYearFilter(searchParamsResolved?.any);
  const todayKey = getTodayKey();
  const visibleRoutes = await getRoutesByView(view, todayKey);
  const availableYears = [...new Set(visibleRoutes.map((route) => route.date.slice(0, 4)))].sort(
    (left, right) => Number(right) - Number(left),
  );
  const filteredRoutes = visibleRoutes.filter((route) => {
    const sameYear = yearFilter === "tots" || route.date.startsWith(`${yearFilter}-`);
    return sameYear && routeMatchesQuery(route, query);
  });

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <div className="page-head page-head--split">
            <div>
              <span className="eyebrow">Rutes</span>
              <h1>Calendari de rutes</h1>
            </div>
            <AuthOnly fallback={null}>
              <Link className="button button--primary" href="/rutas/nova">
                Nova ruta
              </Link>
            </AuthOnly>
          </div>

          <form className="route-filters" method="get" aria-label="Buscador i filtre per any">
            {view !== "properes" ? <input type="hidden" name="vista" value={view} /> : null}
            <div className="route-filters__row">
              <label className="route-filters__search">
                <span>Buscar ruta</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Nom, poble, punt d'eixida..."
                />
              </label>

              <label className="route-filters__year">
                <span>Any</span>
                <select name="any" defaultValue={yearFilter}>
                  <option value="tots">Tots</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <div className="route-filters__actions">
                <button type="submit" className="button button--secondary">
                  Filtrar
                </button>
                {query || yearFilter !== "tots" ? (
                  <Link
                    className="button button--secondary"
                    href={buildRoutesHref({ view, query: "", yearFilter: "tots" })}
                  >
                    Netejar
                  </Link>
                ) : null}
              </div>
            </div>
          </form>

          <div className="filter-bar" aria-label="Vista de rutes">
            {(Object.keys(filterLabels) as RouteView[]).map((itemView) => (
              <Link
                key={itemView}
                href={buildRoutesHref({ view: itemView, query, yearFilter })}
                className={`filter-chip ${view === itemView ? "filter-chip--active" : ""}`}
              >
                {filterLabels[itemView]}
              </Link>
            ))}
          </div>

          <div className="route-subscription-hint">
            <Link className="text-link" href="/rutas/calendari">
              Com subscriure el calendari de rutes (.ics)
            </Link>
          </div>

          <div className="route-list">
            {filteredRoutes.map((route) => (
              <Link key={route.slug} href={`/rutas/${route.slug}`} className="route-row">
                <div className="route-row__main">
                  <div className="route-row__top">
                    <span className="pill">{buildDateLabel(route.date)}</span>
                    <span className="pill pill--subtle">{route.town}</span>
                    {route.routeType === "cicloturista" ? <span className="pill">Marcha Cicloturista</span> : null}
                  </div>
                  <h2>{route.name}</h2>
                </div>

                <dl className="stats stats--compact route-row__stats">
                  <div>
                    <dt>Data</dt>
                    <dd>{buildDateLabel(route.date)}</dd>
                  </div>
                  <div>
                    <dt>Hora eixida</dt>
                    <dd>{route.departureTimes.join(" / ")}</dd>
                  </div>
                  <div>
                    <dt>Lloc d&apos;eixida</dt>
                    <dd>{route.meetingPoint}</dd>
                  </div>
                  <div>
                    <dt>Km totals</dt>
                    <dd>{route.kms} km</dd>
                  </div>
                  <div>
                    <dt>Desnivell total</dt>
                    <dd>{route.elevationGain} m</dd>
                  </div>
                  {route.routeType === "cicloturista" ? (
                    <div>
                      <dt>Tipus</dt>
                      <dd>Marcha Cicloturista</dd>
                    </div>
                  ) : (
                    <>
                      <div>
                        <dt>Lloc d&apos;esmorzar</dt>
                        <dd>{route.breakfastPlace}</dd>
                      </div>
                      <div>
                        <dt>Km fins esmorzar</dt>
                        <dd>{route.distanceToBreakfast} km</dd>
                      </div>
                      <div>
                        <dt>Desnivell fins esmorzar</dt>
                        <dd>{route.elevationToBreakfast} m</dd>
                      </div>
                    </>
                  )}
                </dl>
              </Link>
            ))}
          </div>

          {filteredRoutes.length === 0 ? (
            <p className="route-detail__empty">No hi ha rutes que coincidisquen amb este filtre.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
