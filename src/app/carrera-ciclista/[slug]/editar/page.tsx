import { notFound } from "next/navigation";
import { TrofeuForm } from "@/components/trofeu-form";
import { saveTrofeuAction } from "../../actions";
import { getTrofeuBySlug, trofeuToFormValues } from "@/lib/trofeu";

type EditTrofeuPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditTrofeuPage({ params }: EditTrofeuPageProps) {
  const { slug } = await params;
  const item = await getTrofeuBySlug(slug);

  if (!item) {
    notFound();
  }

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <TrofeuForm
            action={saveTrofeuAction}
            initialValues={trofeuToFormValues(item)}
            title="Editar entrada"
            submitLabel="Guardar canvis"
          />
        </div>
      </section>
    </div>
  );
}
