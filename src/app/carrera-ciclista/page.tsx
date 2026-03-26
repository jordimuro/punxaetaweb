import Link from "next/link";
import { AuthOnly } from "@/components/auth";
import { getTrofeuEntradesByStatus, getTrofeuStatus, listTrofeuEntrades } from "@/lib/trofeu";

export const dynamic = "force-dynamic";

type TrofeuPageProps = {
  searchParams: Promise<{ estat?: string }>;
};

type TrofeuFilter = "totes" | "properes" | "arxiu";

function resolveFilter(raw?: string): TrofeuFilter {
  if (raw === "properes" || raw === "arxiu") {
    return raw;
  }

  return "totes";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default async function CarreraCiclistaPage({ searchParams }: TrofeuPageProps) {
  const resolvedSearchParams = await searchParams;
  const filter = resolveFilter(resolvedSearchParams?.estat);
  const items = await getTrofeuEntradesByStatus(filter);
  const allItems = await listTrofeuEntrades();

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <div className="page-head page-head--split">
            <div>
              <span className="eyebrow">Trofeu Vila de Muro-Punxaeta</span>
              <h1>Entrades i notícies</h1>
            </div>
            <AuthOnly fallback={null}>
              <Link className="button button--primary" href="/carrera-ciclista/nova">
                Nova entrada
              </Link>
            </AuthOnly>
          </div>

          <div className="filter-bar" aria-label="Filtre d'entrades">
            {[
              { href: "/carrera-ciclista", label: "Totes", value: "totes" },
              { href: "/carrera-ciclista?estat=properes", label: "Properes", value: "properes" },
              { href: "/carrera-ciclista?estat=arxiu", label: "Arxiu", value: "arxiu" },
            ].map((item) => (
              <Link
                key={item.value}
                href={item.href}
                className={`filter-chip ${filter === item.value ? "filter-chip--active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="blog-grid">
            {items.map((item) => {
              const status = getTrofeuStatus(item.date);
              const summary = item.excerpt || stripHtml(item.content).slice(0, 160);

              return (
                <Link key={item.slug} href={`/carrera-ciclista/${item.slug}`} className="blog-card">
                  <div className="blog-card__body">
                    <div className="blog-card__top">
                      <span className="pill">{status === "properes" ? "Propera" : "Arxiu"}</span>
                      <span className="pill pill--subtle">{formatDate(item.date)}</span>
                    </div>
                    <h2>{item.title || item.slug}</h2>
                    <p>{summary}</p>
                    <span className="home-summary-card__cta">Obrir entrada →</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {items.length === 0 ? (
            <p className="route-detail__empty">Encara no hi ha entrades per a este filtre.</p>
          ) : null}

          {allItems.length > 0 ? (
            <p className="route-detail__empty">
              Total d&apos;entrades al trofeu: {allItems.length}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
