import { notFound } from "next/navigation";
import { AuthOnly } from "@/components/auth";
import { RouteForm } from "@/components/route-form";
import { routeToFormValues, getRouteBySlug } from "@/lib/routes";
import { saveRouteAction, saveRouteGpxAction } from "../../actions";

type EditRoutePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditRoutePage({ params }: EditRoutePageProps) {
  const { slug } = await params;
  const route = await getRouteBySlug(slug);

  if (!route) {
    notFound();
  }

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <RouteForm
            action={saveRouteAction}
            initialValues={routeToFormValues(route)}
            title="Editar ruta"
            submitLabel="Guardar canvis"
          />

          <AuthOnly fallback={null}>
            <form action={saveRouteGpxAction} className="upload-shell route-detail__gpx-form">
              <input type="hidden" name="slug" value={route.slug} />
              <div className="upload-shell__header">
                <span className="panel__label">Mapa i perfil</span>
                <h3>Substituir GPX</h3>
                <p>Selecciona un fitxer GPX per a actualitzar el mapa i el perfil de la ruta.</p>
              </div>
              <label className="upload-shell__field">
                <span>Fitxer GPX</span>
                <input
                  type="file"
                  name="gpxFile"
                  accept=".gpx,application/gpx+xml,application/xml,text/xml"
                />
              </label>
              <div className="upload-shell__actions">
                <button className="button button--secondary" type="submit">
                  Guardar GPX
                </button>
              </div>
            </form>
          </AuthOnly>
        </div>
      </section>
    </div>
  );
}
