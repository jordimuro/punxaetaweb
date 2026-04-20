"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth";

type DashboardData = {
  ok: boolean;
  generatedAt: string;
  analytics: {
    summary: {
      totalViews: number;
      viewsLast30d: number;
      uniqueVisitorsLast30d: number;
      routeViewsTotal: number;
      routeViewsLast30d: number;
      lastTrackedAt: string | null;
    };
    topRoutes: Array<{
      slug: string;
      name: string;
      views: number;
    }>;
    topPages: Array<{
      pageKey: string;
      pageType: string;
      views: number;
    }>;
  };
  ics: {
    devicesTotal: number;
    devicesLast30d: number;
    subscribersTotal: number;
    subscribersLast30d: number;
    requestsTotal: number;
    requestsLast30d: number;
    lastSeenAt: string | null;
  };
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Encara no hi ha activitat";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Data no disponible";
  }

  return new Intl.DateTimeFormat("ca-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat("ca-ES").format(value ?? 0);
}

function pageTypeLabel(pageType: string) {
  switch (pageType) {
    case "home":
      return "Inici";
    case "routes-list":
      return "Rutes";
    case "route-detail":
      return "Fitxa ruta";
    case "routes-calendar-subscription":
      return "Subscripció calendari";
    case "photos":
      return "Publicacions";
    case "trofeu-list":
      return "Trofeu";
    case "trofeu-detail":
      return "Fitxa trofeu";
    case "equipacions-list":
      return "Equipacions";
    case "equipacions-detail":
      return "Fitxa equipació";
    case "contact":
      return "Contacte";
    default:
      return "Altres";
  }
}

export default function EstadistiquesPage() {
  const { ready, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!ready || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    fetch("/api/estadistiques/dashboard", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No s'han pogut carregar les estadístiques.");
        }

        const payload = (await response.json()) as DashboardData;
        if (!cancelled) {
          setError(null);
          setData(payload);
        }
      })
      .catch((fetchError: unknown) => {
        if (cancelled) {
          return;
        }

        const message = fetchError instanceof Error ? fetchError.message : "Error carregant el dashboard.";
        setError(message);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ready]);

  const dashboardUpdatedAt = useMemo(
    () => formatDateTime(data?.generatedAt ?? null),
    [data?.generatedAt],
  );
  const loading = isAuthenticated && ready && !data && !error;
  const trafficLastTrackedAt = useMemo(
    () => formatDateTime(data?.analytics.summary.lastTrackedAt ?? null),
    [data?.analytics.summary.lastTrackedAt],
  );
  const icsLastSeenAt = useMemo(
    () => formatDateTime(data?.ics.lastSeenAt ?? null),
    [data?.ics.lastSeenAt],
  );

  if (!ready) {
    return (
      <div className="page">
        <section className="section">
          <div className="container">
            <p className="route-detail__empty">Carregant estadístiques...</p>
          </div>
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page">
        <section className="section">
          <div className="container">
            <article className="panel settings-panel">
              <span className="panel__label">Estadístiques</span>
              <h1>Zona privada</h1>
              <p>Necessites iniciar sessió per a veure el dashboard d&apos;administració.</p>
              <div className="form-actions">
                <Link href="/login" className="button button--primary">
                  Iniciar sessió
                </Link>
              </div>
            </article>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <div className="page-head page-head--tight">
            <span className="eyebrow">Estadístiques</span>
            <h1>Dashboard d&apos;ús web</h1>
            <p className="lead">
              Resum de trànsit, visites a rutes i activitat del calendari ICS.
            </p>
          </div>

          {loading ? <p className="route-detail__empty">Actualitzant dashboard...</p> : null}
          {error ? <p className="form__alert">{error}</p> : null}

          <section className="analytics-grid">
            <article className="panel analytics-kpi">
              <span className="panel__label">Visites</span>
              <h2>{formatNumber(data?.analytics.summary.totalViews)}</h2>
              <p>Total de pàgines vistes registrades.</p>
            </article>

            <article className="panel analytics-kpi">
              <span className="panel__label">Últims 30 dies</span>
              <h2>{formatNumber(data?.analytics.summary.viewsLast30d)}</h2>
              <p>Visites recents de la web.</p>
            </article>

            <article className="panel analytics-kpi">
              <span className="panel__label">Visitants únics</span>
              <h2>{formatNumber(data?.analytics.summary.uniqueVisitorsLast30d)}</h2>
              <p>Estimació de dispositius únics (30 dies).</p>
            </article>

            <article className="panel analytics-kpi">
              <span className="panel__label">Rutes</span>
              <h2>{formatNumber(data?.analytics.summary.routeViewsTotal)}</h2>
              <p>Visualitzacions totals de fitxes de ruta.</p>
            </article>

            <article className="panel analytics-kpi">
              <span className="panel__label">Rutes · 30 dies</span>
              <h2>{formatNumber(data?.analytics.summary.routeViewsLast30d)}</h2>
              <p>Visualitzacions recents de fitxes de ruta.</p>
            </article>

            <article className="panel analytics-kpi">
              <span className="panel__label">Últim registre</span>
              <h2 className="analytics-kpi__date">{trafficLastTrackedAt}</h2>
              <p>Última visita registrada al tracking web.</p>
            </article>
          </section>

          <article className="panel settings-panel">
            <span className="panel__label">Calendari ICS</span>
            <h2>Subscriptors i activitat</h2>

            <div className="analytics-mini-grid">
              <div className="analytics-mini-card">
                <span>Subscriptors estimats</span>
                <strong>{formatNumber(data?.ics.subscribersTotal)}</strong>
              </div>
              <div className="analytics-mini-card">
                <span>Subscriptors actius (30 dies)</span>
                <strong>{formatNumber(data?.ics.subscribersLast30d)}</strong>
              </div>
              <div className="analytics-mini-card">
                <span>Consultes ICS totals</span>
                <strong>{formatNumber(data?.ics.requestsTotal)}</strong>
              </div>
              <div className="analytics-mini-card">
                <span>Consultes ICS (30 dies)</span>
                <strong>{formatNumber(data?.ics.requestsLast30d)}</strong>
              </div>
              <div className="analytics-mini-card">
                <span>Dispositius detectats</span>
                <strong>{formatNumber(data?.ics.devicesTotal)}</strong>
              </div>
              <div className="analytics-mini-card">
                <span>Última activitat ICS</span>
                <strong>{icsLastSeenAt}</strong>
              </div>
            </div>
          </article>

          <section className="analytics-lists">
            <article className="panel settings-panel">
              <span className="panel__label">Top rutes</span>
              <h2>Rutes més vistes (30 dies)</h2>
              {data?.analytics.topRoutes.length ? (
                <ol className="analytics-list">
                  {data.analytics.topRoutes.map((route) => (
                    <li key={route.slug}>
                      <div>
                        <strong>{route.name}</strong>
                        <span>/rutas/{route.slug}</span>
                      </div>
                      <span>{formatNumber(route.views)} visites</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="route-detail__empty">Encara no hi ha prou dades de visites a rutes.</p>
              )}
            </article>

            <article className="panel settings-panel">
              <span className="panel__label">Top pàgines</span>
              <h2>Pàgines més visitades (30 dies)</h2>
              {data?.analytics.topPages.length ? (
                <ol className="analytics-list">
                  {data.analytics.topPages.map((page) => (
                    <li key={page.pageKey}>
                      <div>
                        <strong>{pageTypeLabel(page.pageType)}</strong>
                        <span>{page.pageKey}</span>
                      </div>
                      <span>{formatNumber(page.views)} visites</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="route-detail__empty">Encara no hi ha prou dades de visites de pàgina.</p>
              )}
            </article>
          </section>

          <article className="panel analytics-footnote">
            <p>
              Dades actualitzades: <strong>{dashboardUpdatedAt}</strong>. El tracking és una estimació per
              dispositiu amb deduplicació temporal.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
