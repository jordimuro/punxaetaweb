import Link from "next/link";
import { notFound } from "next/navigation";
import { buildDateLabel, getRouteBySlug } from "@/lib/routes";

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
            <Link className="button button--secondary" href={`/rutas/${route.slug}/editar`}>
              Editar ruta
            </Link>
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
                <div>
                  <dt>Punt de trobada</dt>
                  <dd>{route.meetingPoint}</dd>
                </div>
              </dl>
            </article>

            <aside className="panel panel--accent">
              <span className="panel__label">Notes</span>
              <div className="notes">
                <p>{route.notes}</p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
