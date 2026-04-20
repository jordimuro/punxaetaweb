import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthOnly } from "@/components/auth";
import { GpxViewer } from "@/components/gpx-viewer";
import {
  buildDateLabel,
  getRouteBySlug,
  getRouteGpxContent,
  getRouteSecondaryGpxContent,
} from "@/lib/routes";
import { deleteRouteAction } from "../actions";

export const dynamic = "force-dynamic";

type RouteDetailProps = {
  params: Promise<{ slug: string }>;
};

export default async function RouteDetailPage({ params }: RouteDetailProps) {
  const { slug } = await params;
  const route = await getRouteBySlug(slug);

  if (!route) {
    notFound();
  }

  const [gpxContent, secondaryGpxContent] = await Promise.all([
    getRouteGpxContent(route),
    getRouteSecondaryGpxContent(route),
  ]);
  const hasPrimaryGpx = Boolean(route.gpxFileName);
  const hasSecondaryGpx = route.routeType === "cicloturista" && Boolean(route.gpxFileNameSecondary);
  const hasAnyGpx = hasPrimaryGpx || hasSecondaryGpx;
  const normalizeRouteName = (value: string | null | undefined) =>
    (value ?? "").replace(/^nom\s+recorregut\s*[12]\s*:\s*/i, "").trim();
  const primaryRouteName = normalizeRouteName(route.gpxRouteName) || "Recorregut 1";
  const secondaryRouteName = normalizeRouteName(route.gpxRouteNameSecondary);
  const hasSecondaryRouteInfo = Boolean(secondaryRouteName);
  const officialUrl = (() => {
    if (!route.externalUrl) {
      return null;
    }

    try {
      return new URL(route.externalUrl);
    } catch {
      return null;
    }
  })();

  return (
    <div className="page">
      <section className="section">
        <div className="container route-detail">
          <div className="detail-toolbar">
            <Link className="text-link" href="/rutas">
              ← Tornar al llistat
            </Link>
            <AuthOnly
              fallback={null}
            >
              <div className="detail-toolbar__actions">
                <Link className="button button--secondary" href={`/rutas/${route.slug}/editar`}>
                  Editar recorregut
                </Link>
                <Link className="button button--secondary" href={`/rutas/nova?duplicar=${route.slug}`}>
                  Duplicar
                </Link>
                <form action={deleteRouteAction}>
                  <input type="hidden" name="slug" value={route.slug} />
                  <button className="button button--danger" type="submit">
                    Eliminar ruta
                  </button>
                </form>
              </div>
            </AuthOnly>
          </div>

          <div className="page-head page-head--tight">
            <span className="eyebrow">
              {route.routeType === "cicloturista" ? "Marcha Cicloturista" : "Detall de ruta"}
            </span>
            <h1>{route.name}</h1>
          </div>

          <div className="route-detail__grid">
            <article className="panel">
              <span className="panel__label">Informació principal</span>
              {route.routeType === "cicloturista" ? (
                <dl className="stats stats--stacked">
                  <div>
                    <dt>Data</dt>
                    <dd>{buildDateLabel(route.date)}</dd>
                  </div>
                  <div>
                    <dt>Població</dt>
                    <dd>{route.town}</dd>
                  </div>
                  <div>
                    <dt>Tipus</dt>
                    <dd>Marcha Cicloturista</dd>
                  </div>
                </dl>
              ) : (
                <dl className="stats stats--stacked">
                  <div>
                    <dt>Data</dt>
                    <dd>{buildDateLabel(route.date)}</dd>
                  </div>
                  <div>
                    <dt>Població</dt>
                    <dd>{route.town}</dd>
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
                </dl>
              )}
            </article>

            {route.routeType === "cicloturista" ? (
              <aside className="panel panel--accent">
                <span className="panel__label">Web oficial</span>
                <div className="route-official-card">
                  <p className="route-official-card__title">Informació de la marxa</p>
                  {officialUrl ? (
                    <>
                      <p className="route-official-card__host">{officialUrl.host}</p>
                      <p className="route-official-card__path">{officialUrl.pathname || "/"}</p>
                      <a
                        className="button button--secondary button--small"
                        href={route.externalUrl ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Obrir web oficial
                      </a>
                    </>
                  ) : (
                    <p className="route-detail__empty">No hi ha una web oficial vàlida configurada.</p>
                  )}
                </div>
              </aside>
            ) : (
              <aside className="panel panel--accent">
                <span className="panel__label">Recorregut</span>
                <div className="notes">
                  <p>{route.notes}</p>
                </div>
              </aside>
            )}
          </div>

          {route.routeType === "cicloturista" ? (
            <section className="panel route-detail__variants">
              <span className="panel__label">Recorreguts</span>
              <h2>Recorreguts</h2>
              <div className="route-variant-stack">
                <div className="route-variant-card">
                  <p className="route-variant-card__title">{primaryRouteName}</p>
                  <dl className="stats stats--stacked">
                    <div>
                      <dt>Punt eixida</dt>
                      <dd>{route.meetingPoint}</dd>
                    </div>
                    <div>
                      <dt>Hora eixida</dt>
                      <dd>{route.departureTimes[0] ?? "-"}</dd>
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
                </div>

                {hasSecondaryRouteInfo ? (
                  <div className="route-variant-card">
                    <p className="route-variant-card__title">{secondaryRouteName}</p>
                    <dl className="stats stats--stacked">
                      <div>
                        <dt>Punt eixida</dt>
                        <dd>{route.meetingPointSecondary ?? "-"}</dd>
                      </div>
                      <div>
                        <dt>Hora eixida</dt>
                        <dd>{route.departureTimeSecondary ?? "-"}</dd>
                      </div>
                      <div>
                        <dt>Kms</dt>
                        <dd>{route.kmsSecondary !== null ? `${route.kmsSecondary} km` : "-"}</dd>
                      </div>
                      <div>
                        <dt>Desnivell</dt>
                        <dd>{route.elevationGainSecondary !== null ? `${route.elevationGainSecondary} m` : "-"}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="panel route-detail__gpx">
            <span className="panel__label">{route.routeType === "cicloturista" ? "Mapes" : "Mapa i perfil"}</span>
            <h2>{route.routeType === "cicloturista" ? "Mapes i ascensions" : "Mapa i perfil"}</h2>
            {hasAnyGpx ? (
              <div className="route-detail__gpx-list">
                {hasPrimaryGpx ? (
                  <div className="route-gpx-block">
                    <h3 className="route-gpx-block__title">{primaryRouteName}</h3>
                    <GpxViewer
                      gpxContent={gpxContent}
                      gpxFileName={route.gpxFileName}
                    />
                  </div>
                ) : null}
                {hasSecondaryGpx ? (
                  <div className="route-gpx-block">
                    <h3 className="route-gpx-block__title">{secondaryRouteName || "Recorregut 2"}</h3>
                    <GpxViewer
                      gpxContent={secondaryGpxContent}
                      gpxFileName={route.gpxFileNameSecondary}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="route-detail__empty">Encara no hi ha un recorregut amb mapa i perfil.</p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
