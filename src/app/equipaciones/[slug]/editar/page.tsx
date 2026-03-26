import { notFound } from "next/navigation";
import { EquipmentForm } from "@/components/equipment-form";
import { equipmentToFormValues, getEquipacioBySlug } from "@/lib/equipacions";
import { saveEquipacioAction } from "../../actions";

type EditEquipmentPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditEquipmentPage({ params }: EditEquipmentPageProps) {
  const { slug } = await params;
  const item = await getEquipacioBySlug(slug);

  if (!item) {
    notFound();
  }

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <EquipmentForm
            action={saveEquipacioAction}
            initialValues={equipmentToFormValues(item)}
            initialMedia={{
              images: item.imagePaths,
              videos: item.videoPaths,
            }}
            title="Editar equipació"
            submitLabel="Guardar canvis"
          />
        </div>
      </section>
    </div>
  );
}
