import { emptyEquipmentValues } from "@/lib/equipacions";
import { EquipmentForm } from "@/components/equipment-form";
import { saveEquipacioAction } from "../actions";

export default function NewEquipmentPage() {
  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <EquipmentForm
            action={saveEquipacioAction}
            initialValues={emptyEquipmentValues()}
            title="Nova equipació"
            submitLabel="Crear equipació"
          />
        </div>
      </section>
    </div>
  );
}

