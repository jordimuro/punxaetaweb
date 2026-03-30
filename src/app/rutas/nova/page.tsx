import { RouteForm } from "@/components/route-form";
import { buildDuplicateRouteValues, emptyRouteValues } from "@/lib/routes";
import { saveRouteAction } from "../actions";

type NewRoutePageProps = {
  searchParams: Promise<{ duplicar?: string }>;
};

export default async function NewRoutePage({ searchParams }: NewRoutePageProps) {
  const resolvedSearchParams = await searchParams;
  const duplicateSlug = resolvedSearchParams?.duplicar?.trim();
  const duplicatedValues = duplicateSlug ? await buildDuplicateRouteValues(duplicateSlug) : null;
  const initialValues = duplicatedValues ?? emptyRouteValues();

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <RouteForm
            action={saveRouteAction}
            initialValues={initialValues}
            title={duplicatedValues ? "Duplicar ruta" : "Nova ruta"}
            submitLabel={duplicatedValues ? "Crear ruta duplicada" : "Crear ruta"}
          />
        </div>
      </section>
    </div>
  );
}
