import { emptyTrofeuValues } from "@/lib/trofeu";
import { TrofeuForm } from "@/components/trofeu-form";
import { saveTrofeuAction } from "../actions";

export default function NewTrofeuPage() {
  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <TrofeuForm
            action={saveTrofeuAction}
            initialValues={emptyTrofeuValues()}
            title="Nova entrada"
            submitLabel="Crear entrada"
          />
        </div>
      </section>
    </div>
  );
}
