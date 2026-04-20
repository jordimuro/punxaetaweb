import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthOnly } from "@/components/auth";
import { GpxViewer } from "@/components/gpx-viewer";
import {
  getRouteTemplateBySlug,
  getRouteTemplateGpxContent,
  getRouteTemplateSecondaryGpxContent,
} from "@/lib/route-templates";
import { deleteRouteTemplateAction } from "../actions";

export const dynamic = "force-dynamic";

type RouteTemplateDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function RouteTemplateDetailPage({ params }: RouteTemplateDetailPageProps) {
  const { slug } = await params;
  const template = await getRouteTemplateBySlug(slug);

  if (!template) {
    notFound();
  }

  const [gpxContent, secondaryGpxContent] = await Promise.all([
    getRouteTemplateGpxContent(template),
    getRouteTemplateSecondaryGpxContent(template),
  ]);
  const hasPrimaryGpx = Boolean(template.gpxFileName);
  const hasSecondaryGpx = template.routeType === "cicloturista" && Boolean(template.gpxFileNameSecondary);
  const hasAnyGpx = hasPrimaryGpx || hasSecondaryGpx;
  const primaryRouteName = template.gpxRouteName || "Recorregut 1";
  const secondaryRouteName = template.gpxRouteNameSecondary || "Recorregut 2";

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <AuthOnly
            fallback={
              <div className="panel auth-gate">
                <span className="panel__label">Accés privat</span>
                <h2>Inicia sessió per a consultar la DB de rutes.</h2>
                <p>El detall de rutes base només és visible per a administració.</p>
                <div className="form-actions">
                  <Link className="button button--secondary" href="/rutas">
                    Tornar a rutes
                  </Link>
                  <Link className="button button--primary" href="/login">
                    Iniciar sessió
                  </Link>
                </div>
              </div>
            }
          >
            <div className="route-detail">
              <div className="detail-toolbar">
                <Link className="text-link" href="/rutas/llistat">
                  ← Tornar al llistat
                </Link>
                <div className="detail-toolbar__actions">
                  <Link className="button button--secondary" href={`/rutas/llistat/${template.slug}/editar`}>
                    Editar
                  </Link>
                  <Link className="button button--secondary" href={`/rutas/llistat/nova?duplicar=${template.slug}`}>
                    Duplicar
                  </Link>
                  <form action={deleteRouteTemplateAction}>
                    <input type="hidden" name="slug" value={template.slug} />
                    <button className="button button--danger" type="submit">
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>

              <div className="page-head page-head--tight">
                <span className="eyebrow">{template.routeType === "cicloturista" ? "Marxa cicloturista" : "Ruta base"}</span>
                <h1>{template.name}</h1>
              </div>

              <div className="route-detail__grid">
                <article className="panel">
                  <span className="panel__label">Informació principal</span>
                  <dl className="stats stats--stacked">
                    <div>
                      <dt>Població</dt>
                      <dd>{template.town}</dd>
                    </div>
                    <div>
                      <dt>Hora eixida</dt>
                      <dd>{[template.departureTimeOne, template.departureTimeTwo].filter(Boolean).join(" / ")}</dd>
                    </div>
                    <div>
                      <dt>Lloc d&apos;eixida</dt>
                      <dd>{template.meetingPoint}</dd>
                    </div>
                    <div>
                      <dt>Km totals</dt>
                      <dd>{template.kms} km</dd>
                    </div>
                    <div>
                      <dt>Desnivell total</dt>
                      <dd>{template.elevationGain} m</dd>
                    </div>
                    {template.routeType === "cicloturista" ? (
                      <div>
                        <dt>Tipus</dt>
                        <dd>Marxa cicloturista</dd>
                      </div>
                    ) : (
                      <>
                        <div>
                          <dt>Lloc d&apos;esmorzar</dt>
                          <dd>{template.breakfastPlace}</dd>
                        </div>
                        <div>
                          <dt>Km fins esmorzar</dt>
                          <dd>{template.distanceToBreakfast} km</dd>
                        </div>
                        <div>
                          <dt>Desnivell fins esmorzar</dt>
                          <dd>{template.elevationToBreakfast} m</dd>
                        </div>
                      </>
                    )}
                  </dl>
                </article>

                <aside className="panel panel--accent">
                  <span className="panel__label">Recorregut</span>
                  <div className="notes">
                    <p>{template.notes || "Sense descripció."}</p>
                  </div>
                </aside>
              </div>

              <section className="panel route-detail__gpx">
                <span className="panel__label">Mapa i perfil</span>
                <h2>Mapes guardats en la DB</h2>
                {hasAnyGpx ? (
                  <div className="route-detail__gpx-list">
                    {hasPrimaryGpx ? (
                      <div className="route-gpx-block">
                        <h3 className="route-gpx-block__title">{primaryRouteName}</h3>
                        <GpxViewer gpxContent={gpxContent} gpxFileName={template.gpxFileName} />
                      </div>
                    ) : null}
                    {hasSecondaryGpx ? (
                      <div className="route-gpx-block">
                        <h3 className="route-gpx-block__title">{secondaryRouteName}</h3>
                        <GpxViewer gpxContent={secondaryGpxContent} gpxFileName={template.gpxFileNameSecondary} />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="route-detail__empty">Encara no hi ha GPX guardat per a esta ruta base.</p>
                )}
              </section>
            </div>
          </AuthOnly>
        </div>
      </section>
    </div>
  );
}
