import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthOnly } from "@/components/auth";
import { deleteTrofeuAction } from "../actions";
import { getTrofeuBySlug } from "@/lib/trofeu";

export const dynamic = "force-dynamic";

type TrofeuDetailProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default async function TrofeuDetailPage({ params }: TrofeuDetailProps) {
  const { slug } = await params;
  const item = await getTrofeuBySlug(slug);

  if (!item) {
    notFound();
  }

  return (
    <div className="page">
      <section className="section">
        <div className="container route-detail">
          <div className="detail-toolbar">
            <Link className="text-link" href="/carrera-ciclista">
              ← Tornar al llistat
            </Link>
            <AuthOnly fallback={null}>
              <div className="detail-toolbar__actions">
                <Link className="button button--secondary" href={`/carrera-ciclista/${item.slug}/editar`}>
                  Editar entrada
                </Link>
                <form action={deleteTrofeuAction}>
                  <input type="hidden" name="slug" value={item.slug} />
                  <button className="button button--danger" type="submit">
                    Eliminar entrada
                  </button>
                </form>
              </div>
            </AuthOnly>
          </div>

          <div className="page-head page-head--tight">
            <span className="eyebrow">Trofeu Vila de Muro-Punxaeta</span>
            <h1>{item.title || item.slug}</h1>
            <p className="route-detail__meta">{formatDate(item.date)}</p>
          </div>

          <section className="panel">
            <div className="blog-content" dangerouslySetInnerHTML={{ __html: item.content }} />
          </section>
        </div>
      </section>
    </div>
  );
}
