import { notFound } from "next/navigation";
import { RouteForm } from "@/components/route-form";
import { routeToFormValues, getRouteBySlug } from "@/lib/routes";
import { saveRouteAction } from "../../actions";

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
        </div>
      </section>
    </div>
  );
}
