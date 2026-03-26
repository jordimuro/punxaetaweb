import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthOnly } from "@/components/auth";
import { EquipmentCarousel } from "@/components/equipment-carousel";
import { deleteEquipacioAction } from "../actions";
import { getEquipacioBySlug } from "@/lib/equipacions";

export const dynamic = "force-dynamic";

type EquipmentDetailProps = {
  params: Promise<{ slug: string }>;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function EquipmentDetailPage({ params }: EquipmentDetailProps) {
  const { slug } = await params;
  const item = await getEquipacioBySlug(slug);

  if (!item) {
    notFound();
  }

  return (
    <div className="page">
      <section className="section">
        <div className="container route-detail">
          <div className="detail-toolbar">
            <Link className="text-link" href="/equipaciones">
              ← Tornar al llistat
            </Link>
            <AuthOnly fallback={null}>
              <div className="detail-toolbar__actions">
                <Link className="button button--secondary" href={`/equipaciones/${item.slug}/editar`}>
                  Editar equipació
                </Link>
                <form action={deleteEquipacioAction}>
                  <input type="hidden" name="slug" value={item.slug} />
                  <button className="button button--danger" type="submit">
                    Eliminar equipació
                  </button>
                </form>
              </div>
            </AuthOnly>
          </div>

          <div className="page-head page-head--tight">
            <span className="eyebrow">Detall d&apos;equipació</span>
            <h1>{item.name}</h1>
            <p className="lead">{item.description}</p>
          </div>

          <div className="route-detail__grid">
            <article className="panel">
              <span className="panel__label">Fitxa</span>
              <dl className="stats stats--stacked">
                <div>
                  <dt>Temporada</dt>
                  <dd>{item.year}</dd>
                </div>
                <div>
                  <dt>Talles disponibles</dt>
                  <dd>{item.sizes}</dd>
                </div>
                <div>
                  <dt>Preu</dt>
                  <dd>{formatPrice(item.price)}</dd>
                </div>
              </dl>
            </article>

            <aside className="panel panel--accent">
              <span className="panel__label">Descripció</span>
              <div className="notes">
                <p>{item.description}</p>
              </div>
            </aside>
          </div>

          <section className="panel route-detail__gpx">
            <span className="panel__label">Imatges</span>
            <h2>Galeria del producte</h2>
            <EquipmentCarousel title={item.name} images={item.imagePaths} />

            {item.videoPaths.length > 0 ? (
              <div className="equipment-video-list">
                {item.videoPaths.map((videoPath) => (
                  <video key={videoPath} className="equipment-video-list__item" controls preload="metadata">
                    <source src={videoPath} type="video/mp4" />
                    El teu navegador no pot reproduir este vídeo.
                  </video>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </div>
  );
}
