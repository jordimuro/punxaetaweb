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
              Subscriu-te al calendari del club per a tindre les rutes sempre
              actualitzades en el mòbil o en l’ordinador.
            </p>
          </div>

          <section className="panel">
            <span className="panel__label">URL del feed</span>
            <h2>Enllaç de subscripció (.ics)</h2>
            <p>
              Copia esta URL per a subscriure’t al calendari des de Google
              Calendar o Apple Calendar.
            </p>
            <p>
              <a className="text-link" href={calendarFeedUrl}>
                {calendarFeedUrl}
              </a>
            </p>
          </section>

          <div className="grid grid--2">
            <article className="card">
              <h3>Telèfon Android</h3>
              <p>
                En Android amb Google Calendar, este enllaç no se sol afegir
                directament des de l’app del mòbil. El procés habitual és fer-ho
                primer des d’un ordinador amb el mateix compte de Google.
              </p>

              <ol>
                <li>Obri Google Calendar des d’un ordinador.</li>
                <li>
                  En la columna esquerra, ves a{" "}
                  <strong>Altres calendaris</strong>.
                </li>
                <li>
                  Prem <strong>+</strong> i selecciona{" "}
                  <strong>Des de URL</strong>.
                </li>
                <li>Apega l’enllaç del calendari.</li>
                <li>
                  Prem <strong>Afegir calendari</strong>.
                </li>
                <li>
                  Després, obri Google Calendar en el teu Android i comprova que
                  el calendari apareix en el menú lateral.
                </li>
              </ol>
            </article>

            <article className="card">
              <h3>Telèfon iPhone</h3>
              <p>
                En iPhone pots subscriure’t a un calendari directament des de
                l’app Calendari, sense passar per la configuració.
              </p>

              <ol>
                <li>Copia l’enllaç ICS del calendari.</li>
                <li>
                  Obri l’app <strong>Calendari</strong>.
                </li>
                <li>
                  Prem <strong>Calendaris</strong> a la part inferior de la
                  pantalla.
                </li>
                <li>
                  Prem <strong>Afegir calendari</strong>.
                </li>
                <li>
                  Selecciona <strong>Afegir calendari de subscripció</strong>.
                </li>
                <li>Apega l’URL i prem <strong>Subscriu-te</strong>.</li>
                <li>
                  Ajusta el nom i el color si vols, i prem <strong>OK</strong>.
                </li>
              </ol>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}