import Link from "next/link";
import { buildDateLabel, getTodayKey, getUpcomingRoutes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const todayKey = getTodayKey();
  const highlightedRoutes = await getUpcomingRoutes(todayKey, 2);
  const firstRoute = highlightedRoutes[0];
  const secondRoute = highlightedRoutes[1];

  return (
    <div className="page">
      <section className="section section--soft">
        <div className="container">
          <div className="home-summary-grid">
            {firstRoute ? (
              <Link className="home-summary-card home-summary-card--route" href={`/rutas/${firstRoute.slug}`}>
                <div className="home-summary-card__top">
                  <span className="pill">Pròxima ruta</span>
                  <span className="pill pill--subtle">{buildDateLabel(firstRoute.date)}</span>
                </div>
                <h3>{firstRoute.name}</h3>
                <dl className="stats stats--compact">
                  <div>
                    <dt>Data</dt>
                    <dd>{buildDateLabel(firstRoute.date)}</dd>
                  </div>
                  <div>
                    <dt>Hora eixida</dt>
                    <dd>{firstRoute.departureTimes.join(" / ")}</dd>
                  </div>
                  <div>
                    <dt>Lloc d&apos;eixida</dt>
                    <dd>{firstRoute.meetingPoint}</dd>
                  </div>
                  <div>
                    <dt>Km totals</dt>
                    <dd>{firstRoute.kms} km</dd>
                  </div>
                  <div>
                    <dt>Desnivell total</dt>
                    <dd>{firstRoute.elevationGain} m</dd>
                  </div>
                  <div>
                    <dt>Lloc d&apos;esmorzar</dt>
                    <dd>{firstRoute.breakfastPlace}</dd>
                  </div>
                  <div>
                    <dt>Km fins esmorzar</dt>
                    <dd>{firstRoute.distanceToBreakfast} km</dd>
                  </div>
                  <div>
                    <dt>Desnivell fins esmorzar</dt>
                    <dd>{firstRoute.elevationToBreakfast} m</dd>
                  </div>
                </dl>
                <span className="home-summary-card__cta">Obrir detall →</span>
              </Link>
            ) : (
              <div className="home-summary-card home-summary-card--route">
                <span className="pill">Pròxima ruta</span>
                <h3>No hi ha rutes programades.</h3>
                <p>Quan es cree la següent ruta apareixerà ací de manera automàtica.</p>
              </div>
            )}

            {secondRoute ? (
              <Link className="home-summary-card home-summary-card--route" href={`/rutas/${secondRoute.slug}`}>
                <div className="home-summary-card__top">
                  <span className="pill">Pròxima ruta</span>
                  <span className="pill pill--subtle">{buildDateLabel(secondRoute.date)}</span>
                </div>
                <h3>{secondRoute.name}</h3>
                <dl className="stats stats--compact">
                  <div>
                    <dt>Data</dt>
                    <dd>{buildDateLabel(secondRoute.date)}</dd>
                  </div>
                  <div>
                    <dt>Hora eixida</dt>
                    <dd>{secondRoute.departureTimes.join(" / ")}</dd>
                  </div>
                  <div>
                    <dt>Lloc d&apos;eixida</dt>
                    <dd>{secondRoute.meetingPoint}</dd>
                  </div>
                  <div>
                    <dt>Km totals</dt>
                    <dd>{secondRoute.kms} km</dd>
                  </div>
                  <div>
                    <dt>Desnivell total</dt>
                    <dd>{secondRoute.elevationGain} m</dd>
                  </div>
                  <div>
                    <dt>Lloc d&apos;esmorzar</dt>
                    <dd>{secondRoute.breakfastPlace}</dd>
                  </div>
                  <div>
                    <dt>Km fins esmorzar</dt>
                    <dd>{secondRoute.distanceToBreakfast} km</dd>
                  </div>
                  <div>
                    <dt>Desnivell fins esmorzar</dt>
                    <dd>{secondRoute.elevationToBreakfast} m</dd>
                  </div>
                </dl>
                <span className="home-summary-card__cta">Obrir detall →</span>
              </Link>
            ) : (
              <div className="home-summary-card home-summary-card--route">
                <span className="pill">Pròxima ruta</span>
                <h3>No hi ha més rutes programades.</h3>
                <p>Quan es cree una nova ruta, apareixerà ací de manera automàtica.</p>
              </div>
            )}

            <Link className="home-summary-card home-summary-card--event" href="/carrera-ciclista">
              <div className="home-summary-card__top">
                <span className="pill">Trofeu</span>
                <span className="pill pill--subtle">6 de setembre de 2026</span>
              </div>
              <h3>Segona edició del Trofeu Vila de Muro-Punxaeta</h3>
              <p>
                Escoles de ciclisme, cadets xics, xiques i júniors femines en una matinal
                esportiva pensada per a continuar fent créixer la prova.
              </p>
              <dl className="stats stats--compact">
                <div>
                  <dt>Hora</dt>
                  <dd>9:00 h</dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>Matinal</dd>
                </div>
              </dl>
              <span className="home-summary-card__cta">Llegir notícia →</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
