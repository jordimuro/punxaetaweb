import Link from "next/link";
import { AuthOnly } from "@/components/auth";
import { RouteTemplateListLive } from "@/components/route-template-list-live";
import { listRouteTemplates } from "@/lib/route-templates";

export const dynamic = "force-dynamic";

export default async function RouteTemplatesPage() {
  const templates = await listRouteTemplates();

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

            <RouteTemplateListLive templates={templates} />
          </AuthOnly>
        </div>
      </section>
    </div>
  );
}
