import { RouteForm } from "@/components/route-form";
import { buildDuplicateRouteValues, emptyRouteValues } from "@/lib/routes";
import { buildRouteValuesFromTemplate, listRouteTemplateOptions } from "@/lib/route-templates";
import { saveRouteAction } from "../actions";

type NewRoutePageProps = {
  searchParams: Promise<{ duplicar?: string; plantilla?: string }>;
};

export default async function NewRoutePage({ searchParams }: NewRoutePageProps) {
  const resolvedSearchParams = await searchParams;
  const duplicateSlug = resolvedSearchParams?.duplicar?.trim();
  const templateSlug = resolvedSearchParams?.plantilla?.trim();
  const duplicatedValues = duplicateSlug ? await buildDuplicateRouteValues(duplicateSlug) : null;
  const templateValues =
    !duplicatedValues && templateSlug ? await buildRouteValuesFromTemplate(templateSlug) : null;
  const initialValues = duplicatedValues ?? templateValues ?? emptyRouteValues();
  const templateOptions = await listRouteTemplateOptions();

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <RouteForm
            action={saveRouteAction}
            initialValues={initialValues}
            title={duplicatedValues ? "Duplicar ruta" : templateValues ? "Nova ruta des de DB" : "Nova ruta"}
            submitLabel={duplicatedValues ? "Crear ruta duplicada" : "Crear ruta"}
            templateOptions={templateOptions}
            templateSelection={templateSlug ?? ""}
          />
        </div>
      </section>
    </div>
  );
}
