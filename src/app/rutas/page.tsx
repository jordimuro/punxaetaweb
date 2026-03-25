import Link from "next/link";
import {
  buildDateLabel,
  getRoutesByView,
  getTodayKey,
  type RouteView,
} from "@/lib/routes";

export const dynamic = "force-dynamic";

type RoutesPageProps = {
  searchParams: Promise<{ vista?: string }>;
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

export default async function RoutesPage({ searchParams }: RoutesPageProps) {
  const searchParamsResolved = await searchParams;
  const view = resolveView(searchParamsResolved?.vista);
  const todayKey = getTodayKey();
  const visibleRoutes = await getRoutesByView(view, todayKey);

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <div className="page-head page-head--split">
            <div>
              <span className="eyebrow">Rutes</span>
              <h1>Calendari de rutes</h1>
            </div>
            <Link className="button button--primary" href="/rutas/nova">
              Nova ruta
            </Link>
          </div>

          <div className="filter-bar" aria-label="Filtre de rutes">
            {(Object.keys(filterLabels) as RouteView[]).map((itemView) => (
              <Link
                key={itemView}
                href={itemView === "properes" ? "/rutas" : `/rutas?vista=${itemView}`}
                className={`filter-chip ${view === itemView ? "filter-chip--active" : ""}`}
              >
                {filterLabels[itemView]}
              </Link>
            ))}
          </div>

          <div className="route-list">
            {visibleRoutes.map((route) => (
              <Link key={route.slug} href={`/rutas/${route.slug}`} className="route-row">
                <div className="route-row__main">
                  <div className="route-row__top">
                    <span className="pill">{buildDateLabel(route.date)}</span>
                    <span className="pill pill--subtle">{route.town}</span>
                  </div>
                  <h2>{route.name}</h2>
                  <p>{route.summary}</p>
                </div>

                <dl className="stats stats--stacked">
                  <div>
                    <dt>Esmorzar</dt>
                    <dd>{route.breakfastPlace}</dd>
                  </div>
                  <div>
                    <dt>Eixida</dt>
                    <dd>{route.departureTimes.join(" i ")}</dd>
                  </div>
                  <div>
                    <dt>Kms</dt>
                    <dd>{route.kms} km</dd>
                  </div>
                  <div>
                    <dt>Desnivell total</dt>
                    <dd>{route.elevationGain} m</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
