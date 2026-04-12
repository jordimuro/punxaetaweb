"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth";

type IcsStats = {
  subscribersTotal: number;
  subscribersLast30d: number;
  requestsTotal: number;
  requestsLast30d: number;
  lastSeenAt: string | null;
};

type IcsStatsResponse = {
  ok: boolean;
  generatedAt: string;
  stats: IcsStats;
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

export default function SettingsPage() {
  const { ready, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<IcsStats | null>(null);

  useEffect(() => {
    if (!ready || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    fetch("/api/settings/ics-stats", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No s'han pogut carregar les estadístiques del calendari.");
        }

        const payload = (await response.json()) as IcsStatsResponse;
        if (!cancelled) {
          setError(null);
          setStats(payload.stats);
        }
      })
      .catch((fetchError: unknown) => {
        if (cancelled) {
          return;
        }

        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Error desconegut carregant les estadístiques.";
        setError(message);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ready]);

  const lastSeenLabel = useMemo(() => formatDateTime(stats?.lastSeenAt ?? null), [stats?.lastSeenAt]);
  const loading = isAuthenticated && ready && !stats && !error;

  if (!ready) {
    return (
      <div className="page">
        <section className="section">
          <div className="container">
            <p className="route-detail__empty">Carregant configuració...</p>
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
              <span className="panel__label">Settings</span>
              <h1>Zona privada</h1>
              <p>Necessites iniciar sessió per a veure les estadístiques del calendari ICS.</p>
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
            <span className="eyebrow">Settings</span>
            <h1>Configuració i estadístiques</h1>
            <p className="lead">
              Seguiment de subscripcions al calendari de rutes en format `.ics`.
            </p>
          </div>

          <article className="panel settings-panel">
            <span className="panel__label">Calendari ICS</span>
            <h2>Estadística de subscriptors</h2>

            {loading ? <p className="route-detail__empty">Actualitzant dades...</p> : null}
            {error ? <p className="form__alert">{error}</p> : null}

            <dl className="stats settings-stats">
              <div>
                <dt>Subscriptors estimats (total)</dt>
                <dd>{stats?.subscribersTotal ?? 0}</dd>
              </div>
              <div>
                <dt>Subscriptors actius (últims 30 dies)</dt>
                <dd>{stats?.subscribersLast30d ?? 0}</dd>
              </div>
              <div>
                <dt>Consultes de l&apos;enllaç ICS (total)</dt>
                <dd>{stats?.requestsTotal ?? 0}</dd>
              </div>
              <div>
                <dt>Consultes ICS (últims 30 dies)</dt>
                <dd>{stats?.requestsLast30d ?? 0}</dd>
              </div>
              <div>
                <dt>Última activitat detectada</dt>
                <dd>{lastSeenLabel}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>
    </div>
  );
}
