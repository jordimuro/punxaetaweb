import Image from "next/image";
import Link from "next/link";
import { listPhotoPosts } from "@/lib/photos";
import { buildDateLabel, getRouteGpxContent, getTodayKey, getUpcomingRoutes } from "@/lib/routes";
import { listTrofeuEntrades } from "@/lib/trofeu";

export const dynamic = "force-dynamic";

function formatTrofeuDate(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatCreatedAt(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function buildRouteProfilePreviewDataUri(gpxContent: string | null | undefined) {
  if (!gpxContent) {
    return null;
  }

  const elevations = Array.from(gpxContent.matchAll(/<ele>([^<]+)<\/ele>/g))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));

  if (elevations.length < 8) {
    return null;
  }

  const targetPoints = 96;
  const step = Math.max(1, Math.floor(elevations.length / targetPoints));
  const sampled = elevations.filter((_, index) => index % step === 0).slice(0, targetPoints);

  if (sampled.length < 2) {
    return null;
  }

  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = Math.max(1, max - min);
  const width = 800;
  const height = 320;
  const chartTop = 24;
  const chartBottom = 270;
  const chartHeight = chartBottom - chartTop;

  const points = sampled.map((elevation, index) => {
    const x = (index / (sampled.length - 1)) * width;
    const normalized = (elevation - min) / range;
    const y = chartBottom - normalized * chartHeight;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${width} ${chartBottom} L 0 ${chartBottom} Z`;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#f7fbff"/>
      <stop offset="100%" stop-color="#e7f1fb"/>
    </linearGradient>
    <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#64b7ea" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#64b7ea" stop-opacity="0.10"/>
    </linearGradient>
    <linearGradient id="line" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#1c5b95"/>
      <stop offset="100%" stop-color="#0f2f52"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)"/>
  <path d="${areaPath}" fill="url(#area)"/>
  <path d="${linePath}" fill="none" stroke="url(#line)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default async function HomePage() {
  const todayKey = getTodayKey();
  const upcomingRoutes = await getUpcomingRoutes(todayKey, 2);
  const nextRoute = upcomingRoutes[0];
  const secondRouteSameDay = upcomingRoutes[1] && upcomingRoutes[1].date === nextRoute?.date ? upcomingRoutes[1] : null;
  const featuredRoutes = nextRoute
    ? secondRouteSameDay
      ? [nextRoute, secondRouteSameDay]
      : [nextRoute]
    : [];
  const latestPhotoPost = (await listPhotoPosts())[0];
  const latestTrofeuPost = (await listTrofeuEntrades())[0];
  const routePreviewBySlug = new Map<string, string | null>();

  for (const route of featuredRoutes) {
    const gpxContent = await getRouteGpxContent(route);
    routePreviewBySlug.set(route.slug, buildRouteProfilePreviewDataUri(gpxContent));
  }

  return (
    <div className="page">
      <section className="section section--soft">
        <div className="container">
          <div className="home-summary-grid">
            {featuredRoutes.length > 0 ? (
              featuredRoutes.map((route) => {
                const routeProfilePreview = routePreviewBySlug.get(route.slug);

                return (
                  <Link className="home-summary-card home-summary-card--route" href={`/rutas/${route.slug}`} key={route.slug}>
                    <div className="home-summary-card__top">
                      <span className="pill">Pròxima ruta</span>
                      <span className="pill pill--subtle">{buildDateLabel(route.date)}</span>
                    </div>
                    <h3>{route.name}</h3>
                    {routeProfilePreview ? (
                      <div className="home-summary-card__media home-summary-card__media--compact">
                        <Image
                          src={routeProfilePreview}
                          alt={`Perfil de ${route.name}`}
                          fill
                          sizes="(max-width: 980px) 100vw, 40vw"
                          style={{ objectFit: "cover" }}
                          unoptimized
                        />
                      </div>
                    ) : null}
                    <dl className="stats stats--compact">
                      <div>
                        <dt>Data</dt>
                        <dd>{buildDateLabel(route.date)}</dd>
                      </div>
                      <div>
                        <dt>Població</dt>
                        <dd>{route.town}</dd>
                      </div>
                      <div>
                        <dt>Hora eixida</dt>
                        <dd>{route.departureTimes.join(" / ")}</dd>
                      </div>
                      <div>
                        <dt>Lloc d&apos;eixida</dt>
                        <dd>{route.meetingPoint}</dd>
                      </div>
                      <div>
                        <dt>Km totals</dt>
                        <dd>{route.kms} km</dd>
                      </div>
                    </dl>
                    <span className="home-summary-card__cta">Obrir ruta →</span>
                  </Link>
                );
              })
            ) : (
              <div className="home-summary-card home-summary-card--route">
                <span className="pill">Pròxima ruta</span>
                <h3>No hi ha rutes programades.</h3>
                <p>Quan es cree la següent ruta, apareixerà ací automàticament.</p>
              </div>
            )}

            {latestPhotoPost ? (
              <Link className="home-summary-card home-summary-card--route" href="/publicacions">
                <div className="home-summary-card__top">
                  <span className="pill">Última entrada de fotos</span>
                  <span className="pill pill--subtle">{formatCreatedAt(latestPhotoPost.createdAt)}</span>
                </div>
                <h3>{latestPhotoPost.title}</h3>
                {latestPhotoPost.images.length > 0 ? (
                  <div className="home-summary-card__media-strip" aria-label="Galeria de fotos">
                    {latestPhotoPost.images.map((image, index) => (
                      <div className="home-summary-card__media-item" key={`${latestPhotoPost.id}-${index}`}>
                        <Image
                          src={image}
                          alt={`${latestPhotoPost.title} - foto ${index + 1}`}
                          fill
                          sizes="(max-width: 980px) 80vw, 30vw"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                <span className="home-summary-card__cta">Obrir fotos →</span>
              </Link>
            ) : (
              <div className="home-summary-card home-summary-card--route">
                <span className="pill">Última entrada de fotos</span>
                <h3>Encara no hi ha publicacions de fotos.</h3>
              </div>
            )}

            {latestTrofeuPost ? (
              <Link
                className="home-summary-card home-summary-card--event"
                href={`/carrera-ciclista/${latestTrofeuPost.slug}`}
              >
                <div className="home-summary-card__top">
                  <span className="pill">Última entrada del trofeu</span>
                  <span className="pill pill--subtle">{formatTrofeuDate(latestTrofeuPost.date)}</span>
                </div>
                <h3>{latestTrofeuPost.title || latestTrofeuPost.slug}</h3>
                <p>{latestTrofeuPost.excerpt}</p>
                <span className="home-summary-card__cta">Llegir entrada →</span>
              </Link>
            ) : (
              <div className="home-summary-card home-summary-card--event">
                <span className="pill">Última entrada del trofeu</span>
                <h3>Encara no hi ha notícies del trofeu.</h3>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
