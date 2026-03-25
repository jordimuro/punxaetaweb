import Image from "next/image";
import Link from "next/link";
import { buildDateLabel, getTodayKey, getUpcomingRoutes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const todayKey = getTodayKey();
  const highlightedRoutes = await getUpcomingRoutes(todayKey, 1);
  const nextRoute = highlightedRoutes[0];

  return (
    <div className="page">
      <section className="section section--soft">
        <div className="container">
          <div className="home-summary-grid">
            {nextRoute ? (
              <Link className="home-summary-card home-summary-card--route" href={`/rutas/${nextRoute.slug}`}>
                <div className="home-summary-card__top">
                  <span className="pill">Pròxima ruta</span>
                  <span className="pill pill--subtle">{buildDateLabel(nextRoute.date)}</span>
                </div>
                <h3>{nextRoute.name}</h3>
                <p>{nextRoute.summary}</p>
                <dl className="stats stats--compact">
                  <div>
                    <dt>Eixida</dt>
                    <dd>{nextRoute.departureTimes.join(" / ")}</dd>
                  </div>
                  <div>
                    <dt>Esmorzar</dt>
                    <dd>{nextRoute.breakfastPlace}</dd>
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
                <span className="home-summary-card__cta">Obrir detall →</span>
              </Link>
            ) : (
              <div className="home-summary-card home-summary-card--route">
                <span className="pill">Pròxima ruta</span>
                <h3>No hi ha rutes programades.</h3>
                <p>Quan es cree la següent ruta apareixerà ací de manera automàtica.</p>
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

            <Link className="home-summary-card home-summary-card--equipacions" href="/equipaciones">
              <div className="home-summary-card__top">
                <span className="pill">Equipacions</span>
                <span className="pill pill--subtle">Nova col·lecció</span>
              </div>
              <div className="home-summary-card__media">
                <Image
                  src="/equipacions/09-frontal-2.jpeg"
                  alt="Maillot del Club Ciclista La Punxaeta"
                  fill
                  sizes="(max-width: 980px) 100vw, 33vw"
                />
              </div>
              <h3>La imatge del club en blau</h3>
              <p>
                Una col·lecció que combina el blau clar més representatiu amb marí i blanc per a
                donar una presència elegant i reconeixible.
              </p>
              <span className="home-summary-card__cta">Veure equipacions →</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
