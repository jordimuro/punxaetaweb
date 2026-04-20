import { RouteTemplateForm } from "@/components/route-template-form";
import {
  buildDuplicateRouteTemplateValues,
  emptyRouteTemplateValues,
} from "@/lib/route-templates";
import { saveRouteTemplateAction } from "../actions";

type NewRouteTemplatePageProps = {
  searchParams: Promise<{ duplicar?: string }>;
};

export default async function NewRouteTemplatePage({ searchParams }: NewRouteTemplatePageProps) {
  const resolvedSearchParams = await searchParams;
  const duplicateSlug = resolvedSearchParams?.duplicar?.trim();
  const duplicatedValues = duplicateSlug ? await buildDuplicateRouteTemplateValues(duplicateSlug) : null;
  const initialValues = duplicatedValues ?? emptyRouteTemplateValues();

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <RouteTemplateForm
            action={saveRouteTemplateAction}
            initialValues={initialValues}
            title={duplicatedValues ? "Duplicar ruta base" : "Nova ruta base"}
            submitLabel={duplicatedValues ? "Crear ruta base duplicada" : "Guardar ruta base"}
          />
        </div>
      </section>
    </div>
  );
}
