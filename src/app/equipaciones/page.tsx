import Image from "next/image";
import Link from "next/link";
import { AuthOnly } from "@/components/auth";
import { getEquipacionsBySeason, getEquipacioSeasons, listEquipacions } from "@/lib/equipacions";

export const dynamic = "force-dynamic";

type EquipacionsPageProps = {
  searchParams: Promise<{ temporada?: string }>;
};

type EquipmentFilter = "totes" | string;

function resolveFilter(raw?: string): EquipmentFilter {
  if (raw && raw !== "totes") {
    return raw;
  }

  return "totes";
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function EquipacionsPage({ searchParams }: EquipacionsPageProps) {
  const resolvedSearchParams = await searchParams;
  const filter = resolveFilter(resolvedSearchParams?.temporada);
  const items = await getEquipacionsBySeason(filter);
  const seasons = getEquipacioSeasons(await listEquipacions());

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <div className="page-head page-head--split">
            <div>
              <span className="eyebrow">Equipacions</span>
              <h1>Catàleg de temporada</h1>
            </div>
            <AuthOnly fallback={null}>
              <Link className="button button--primary" href="/equipaciones/nova">
                Nova equipació
              </Link>
            </AuthOnly>
          </div>

          <div className="filter-bar" aria-label="Filtre de temporades">
            <Link
              href="/equipaciones"
              className={`filter-chip ${filter === "totes" ? "filter-chip--active" : ""}`}
            >
              Totes
            </Link>
            {seasons.map((season) => (
              <Link
                key={season}
                href={`/equipaciones?temporada=${season}`}
                className={`filter-chip ${String(filter) === String(season) ? "filter-chip--active" : ""}`}
              >
                {season}
              </Link>
            ))}
          </div>

          <div className="equipment-list">
            {items.map((item) => (
              <Link key={item.slug} href={`/equipaciones/${item.slug}`} className="equipment-row">
                <div className="equipment-row__media">
                  <Image
                    src={item.imagePaths[0]}
                    alt={item.name}
                    fill
                    sizes="(max-width: 980px) 100vw, 34vw"
                  />
                </div>

                <div className="equipment-row__main">
                  <div className="equipment-row__top">
                    <span className="pill">Temporada {item.year}</span>
                    <span className="pill pill--subtle">{formatPrice(item.price)}</span>
                  </div>
                  <h2>{item.name}</h2>
                  <p>{item.description}</p>
                </div>

                <dl className="stats stats--stacked equipment-row__stats">
                  <div>
                    <dt>Talles</dt>
                    <dd>{item.sizes}</dd>
                  </div>
                  <div>
                    <dt>Preu</dt>
                    <dd>{formatPrice(item.price)}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>

          {items.length === 0 ? (
            <p className="route-detail__empty">No hi ha equipacions per a esta temporada.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
