import { notFound } from "next/navigation";
import { RouteTemplateForm } from "@/components/route-template-form";
import { getRouteTemplateBySlug, routeTemplateToFormValues } from "@/lib/route-templates";
import { saveRouteTemplateAction } from "../../actions";

type EditRouteTemplatePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditRouteTemplatePage({ params }: EditRouteTemplatePageProps) {
  const { slug } = await params;
  const template = await getRouteTemplateBySlug(slug);

  if (!template) {
    notFound();
  }

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <RouteTemplateForm
            action={saveRouteTemplateAction}
            initialValues={routeTemplateToFormValues(template)}
            title="Editar ruta base"
            submitLabel="Guardar canvis"
          />
        </div>
      </section>
    </div>
  );
}
