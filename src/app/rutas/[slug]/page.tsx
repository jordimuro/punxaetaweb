import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthOnly } from "@/components/auth";
import { GpxViewer } from "@/components/gpx-viewer";
import { buildDateLabel, getRouteBySlug } from "@/lib/routes";
import { deleteRouteAction, saveRouteGpxAction } from "../actions";

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
            <span className="eyebrow">Detall de ruta</span>
            <h1>{route.name}</h1>
            <p className="lead">{route.summary}</p>
          </div>

          <div className="route-detail__grid">
            <article className="panel">
              <span className="panel__label">Informació principal</span>
              <dl className="stats stats--stacked">
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
            </article>

            <aside className="panel panel--accent">
              <span className="panel__label">Recorregut</span>
              <div className="notes">
                <p>{route.notes}</p>
              </div>
            </aside>
          </div>

          <section className="panel route-detail__gpx">
            <span className="panel__label">Mapa i perfil</span>
            <h2>Mapa i perfil</h2>
            {route.gpxFileName ? (
              <GpxViewer gpxContent={route.gpxContent} />
            ) : (
              <p className="route-detail__empty">Encara no hi ha un recorregut amb mapa i perfil.</p>
            )}

            <AuthOnly fallback={null}>
              <form action={saveRouteGpxAction} className="upload-shell route-detail__gpx-form">
                <input type="hidden" name="slug" value={route.slug} />
                <div className="upload-shell__header">
                  <span className="panel__label">Pujada</span>
                  <h3>Substituir recorregut</h3>
                  <p>Selecciona un fitxer GPX per a actualitzar el mapa i el perfil de la ruta.</p>
                </div>
                <label className="upload-shell__field">
                  <span>Fitxer GPX</span>
                  <input type="file" name="gpxFile" accept=".gpx,application/gpx+xml,application/xml,text/xml" />
                </label>
                <div className="upload-shell__actions">
                  <button className="button button--secondary" type="submit">
                    Guardar recorregut
                  </button>
                </div>
              </form>
            </AuthOnly>
          </section>
        </div>
      </section>
    </div>
  );
}
