import Link from "next/link";
import { headers } from "next/headers";

async function getCalendarFeedUrl() {
  const requestHeaders = await headers();
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = requestHeaders.get("host");
  const protocol = forwardedProto ?? "https";
  const resolvedHost = forwardedHost ?? host;

  if (!resolvedHost) {
    return "/api/calendari/club.ics";
  }

  return `${protocol}://${resolvedHost}/api/calendari/club.ics`;
}

export default async function RoutesCalendarSubscriptionPage() {
  const calendarFeedUrl = await getCalendarFeedUrl();

  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <div className="detail-toolbar">
            <Link className="text-link" href="/rutas">
              ← Tornar a rutes
            </Link>
          </div>

          <div className="page-head page-head--tight">
            <span className="eyebrow">Subscripció</span>
            <h1>Calendari de rutes</h1>
            <p className="lead">
              Subscriu-te al calendari del club per a tindre les rutes en el mòbil i en el teu
              ordinador.
            </p>
          </div>

          <section className="panel">
            <span className="panel__label">URL del feed</span>
            <h2>Enllaç de subscripció (.ics)</h2>
            <p>
              Copia esta URL i utilitza-la en Google Calendar, Apple Calendar o Outlook per a fer la
              subscripció.
            </p>
            <p>
              <a className="text-link" href={calendarFeedUrl}>
                {calendarFeedUrl}
              </a>
            </p>
          </section>

          <div className="grid grid--3">
            <article className="card">
              <h3>Google Calendar</h3>
              <p>
                En el panell esquerre, ves a Altres calendaris, prem + i selecciona Des de URL.
                Pega l&apos;enllaç i confirma.
              </p>
            </article>

            <article className="card">
              <h3>Apple Calendar</h3>
              <p>
                En el menú superior, tria Arxiu &gt; Nova subscripció de calendari, pega l&apos;URL
                i guarda la subscripció.
              </p>
            </article>

            <article className="card">
              <h3>Outlook</h3>
              <p>
                En Afegir calendari, selecciona Subscriure&apos;s des de web, pega l&apos;URL i
                assigna un nom al calendari.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
