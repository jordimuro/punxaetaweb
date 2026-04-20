import Link from "next/link";
import { AuthOnly } from "@/components/auth";
import { listRouteTemplates } from "@/lib/route-templates";
import { clearRouteTemplatesAction, initializeRouteTemplatesSeedAction } from "./actions";

export const dynamic = "force-dynamic";

type RouteTemplatesPageProps = {
  searchParams: Promise<{
    q?: string;
    seed?: string;
    inserted?: string;
    skipped?: string;
    total?: string;
    deleted?: string;
    files?: string;
  }>;
};

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("ca-ES")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function templateMatchesQuery(
  template: {
    routeType: "ruta" | "cicloturista";
    name: string;
    town: string;
    breakfastPlace: string;
    meetingPoint: string;
    notes: string;
    slug: string;
  },
  query: string,
) {
  if (!query) {
    return true;
  }

  const queryNormalized = normalizeSearchText(query);
  const searchable = [
    template.name,
    template.town,
    template.breakfastPlace,
    template.meetingPoint,
    template.notes,
    template.routeType,
    template.slug,
  ]
    .map(normalizeSearchText)
    .join(" ");

  return searchable.includes(queryNormalized);
}

export default async function RouteTemplatesPage({ searchParams }: RouteTemplatesPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = String(resolvedSearchParams?.q ?? "").trim();
  const seedStatus = String(resolvedSearchParams?.seed ?? "").trim();
  const inserted = Number(resolvedSearchParams?.inserted ?? 0);
  const skipped = Number(resolvedSearchParams?.skipped ?? 0);
  const total = Number(resolvedSearchParams?.total ?? 0);
  const deleted = Number(resolvedSearchParams?.deleted ?? 0);
  const files = Number(resolvedSearchParams?.files ?? 0);
  const templates = await listRouteTemplates();
  const filteredTemplates = templates.filter((template) => templateMatchesQuery(template, query));

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <AuthOnly
            fallback={
              <div className="panel auth-gate">
                <span className="panel__label">Accés privat</span>
                <h2>Inicia sessió per a consultar la DB de rutes.</h2>
                <p>El llistat de rutes base només és visible per a administració.</p>
                <div className="form-actions">
                  <Link className="button button--secondary" href="/rutas">
                    Tornar a rutes
                  </Link>
                  <Link className="button button--primary" href="/login">
                    Iniciar sessió
                  </Link>
                </div>
              </div>
            }
          >
            <div className="page-head page-head--split">
              <div>
                <span className="eyebrow">Admin</span>
                <h1>Llistat Rutes</h1>
              </div>
              <Link className="button button--primary" href="/rutas/llistat/nova">
                Crear nova ruta base
              </Link>
            </div>

            <div className="panel seed-actions">
              <span className="panel__label">Seed DB</span>
              <h2>Cargar o netejar base de dades de rutes</h2>
              <p>
                Usa estos botons per inicialitzar la DB en Railway o localhost. L&apos;inicialitzacio esta preparada per al cataleg de 52 rutes.
              </p>
              <div className="seed-actions__buttons">
                <form action={initializeRouteTemplatesSeedAction}>
                  <button className="button button--primary" type="submit">
                    Inicialitzar DB
                  </button>
                </form>
                <form action={clearRouteTemplatesAction}>
                  <button className="button button--danger" type="submit">
                    Netejar DB
                  </button>
                </form>
              </div>
              {seedStatus === "loaded" ? (
                <p className="seed-actions__result">
                  Seed carregat: {inserted} inserides, {skipped} ja existien, cataleg total {total}.
                </p>
              ) : null}
              {seedStatus === "cleared" ? (
                <p className="seed-actions__result">
                  DB netejada: {deleted} rutes eliminades i {files} fitxers GPX eliminats.
                </p>
              ) : null}
            </div>

            <form className="route-filters" method="get" aria-label="Buscador de rutes base">
              <div className="route-filters__row route-filters__row--single">
                <label className="route-filters__search">
                  <span>Buscar ruta base</span>
                  <input type="search" name="q" defaultValue={query} placeholder="Nom, població o punt d'eixida..." />
                </label>
                <div className="route-filters__actions">
                  <button type="submit" className="button button--secondary">
                    Filtrar
                  </button>
                  {query ? (
                    <Link className="button button--secondary" href="/rutas/llistat">
                      Netejar
                    </Link>
                  ) : null}
                </div>
              </div>
            </form>

            <div className="route-template-list">
              {filteredTemplates.map((template, index) => (
                <article key={template.slug} className="route-template-row">
                  <div className="route-template-row__top">
                    <span className="route-template-row__index">{index + 1}</span>
                    <span className="route-template-row__col">{template.town}</span>
                    <span className="route-template-row__col">{template.kms} km</span>
                    <span className="route-template-row__col">{template.elevationGain} m</span>
                    <Link className="button button--secondary button--small" href={`/rutas/llistat/${template.slug}`}>
                      Detall
                    </Link>
                  </div>
                  <div className="route-template-row__bottom">
                    <strong>{template.name}</strong>
                    <span>{template.routeType === "cicloturista" ? "Marxa cicloturista" : "Ruta del club"}</span>
                  </div>
                </article>
              ))}
            </div>

            {filteredTemplates.length === 0 ? (
              <p className="route-detail__empty">No hi ha rutes base que coincidisquen amb el filtre.</p>
            ) : null}
          </AuthOnly>
        </div>
      </section>
    </div>
  );
}
