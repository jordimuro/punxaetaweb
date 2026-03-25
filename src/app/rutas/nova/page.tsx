import { RouteForm } from "@/components/route-form";
import { emptyRouteValues } from "@/lib/routes";
import { saveRouteAction } from "../actions";

export default function NewRoutePage() {
  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <RouteForm
            action={saveRouteAction}
            initialValues={emptyRouteValues()}
            title="Nova ruta"
            submitLabel="Crear ruta"
          />
        </div>
      </section>
    </div>
  );
}
