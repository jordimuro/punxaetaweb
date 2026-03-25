import Link from "next/link";
import {
  buildDateLabel,
  getTodayKey,
  getUpcomingRoutes,
} from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const todayKey = getTodayKey();
  const highlightedRoutes = await getUpcomingRoutes(todayKey, 3);
  const nextRoute = highlightedRoutes[0];

  return (
    <div className="page">
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <span className="eyebrow">Club ciclista</span>
            <h1>Properes rutes</h1>
            <p className="lead">Calendari, carrera i equipacions.</p>
            <div className="hero__actions">
              <Link className="button button--primary" href="/rutas">
                Anar a rutes
              </Link>
              <Link className="button button--secondary" href="/rutas/nova">
                Nova ruta
              </Link>
            </div>
          </div>

          <aside className="panel panel--featured">
            <span className="panel__label">Pròxima eixida</span>
            {nextRoute ? (
              <>
                <h2>{nextRoute.name}</h2>
                <p>{nextRoute.summary}</p>
                <dl className="stats">
                  <div>
                    <dt>Data</dt>
                    <dd>{buildDateLabel(nextRoute.date)}</dd>
                  </div>
                  <div>
                    <dt>Eixida</dt>
                    <dd>{nextRoute.departureTimes.join(" i ")}</dd>
                  </div>
                  <div>
                    <dt>Kms</dt>
                    <dd>{nextRoute.kms} km</dd>
                  </div>
                  <div>
                    <dt>Desnivell</dt>
                    <dd>{nextRoute.elevationGain} m</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p>No hi ha rutes programades.</p>
            )}
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header">
            <span className="eyebrow">Rutes</span>
            <h2>Les més pròximes</h2>
          </div>
          <div className="route-rail">
            {highlightedRoutes.map((route) => (
              <Link key={route.slug} className="route-card" href={`/rutas/${route.slug}`}>
                <div className="route-card__top">
                  <span className="pill">{buildDateLabel(route.date)}</span>
                  <span className="pill pill--subtle">{route.town}</span>
                </div>
                <h3>{route.name}</h3>
                <p>{route.summary}</p>
                <dl className="stats stats--compact">
                  <div>
                    <dt>Esmorzar</dt>
                    <dd>{route.breakfastPlace}</dd>
                  </div>
                  <div>
                    <dt>Eixida</dt>
                    <dd>{route.departureTimes.join(" / ")}</dd>
                  </div>
                  <div>
                    <dt>Kms</dt>
                    <dd>{route.kms} km</dd>
                  </div>
                  <div>
                    <dt>Desnivell</dt>
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
