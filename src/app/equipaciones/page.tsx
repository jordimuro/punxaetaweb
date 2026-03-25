import Image from "next/image";
import Link from "next/link";

const garmentCards = [
  {
    title: "Maillot principal",
    image: "/equipacions/09-frontal-2.jpeg",
    description:
      "La combinació més representativa del club: blanc, marí profund i blau cel amb una franja central molt marcada.",
  },
  {
    title: "Vista posterior",
    image: "/equipacions/10-trasera-2.jpeg",
    description:
      "La part de darrere manté la lectura neta de la marca i conserva la mateixa identitat cromàtica de la part frontal.",
  },
  {
    title: "Xalec tèrmic",
    image: "/equipacions/01-jersey-frontal.jpeg",
    description:
      "Peça lleugera per a matins frescos, amb la banda marina i el blau del club com a protagonistes.",
  },
  {
    title: "Xalec tèrmic posterior",
    image: "/equipacions/02-jersey-trasera.jpeg",
    description:
      "La part posterior manté el mateix llenguatge visual i reforça la presència del logo en moviment.",
  },
  {
    title: "Manguitos",
    image: "/equipacions/03-manguitos.jpeg",
    description:
      "Complement d&apos;entretemps amb base cel blau i acabat marí, pensat per a sumar comoditat sense perdre identitat.",
  },
  {
    title: "Calcetins alts",
    image: "/equipacions/04-calcetin.jpeg",
    description:
      "Una peça discreta però molt visible, amb el blau del club com a to principal i un acabat net i esportiu.",
  },
  {
    title: "Guants curts",
    image: "/equipacions/05-guantes.jpeg",
    description:
      "Per a completar la imatge de grup amb una peça pràctica i lleugera, en marí fosc i amb el logo ben visible.",
  },
  {
    title: "Culot",
    image: "/equipacions/06-culotte.jpeg",
    description:
      "L&apos;apartat inferior manté el marí intens i ajuda a equilibrar el conjunt amb una base sòbria i elegant.",
  },
  {
    title: "Jaqueta d&apos;hivern",
    image: "/equipacions/07-chaqueta.jpeg",
    description:
      "Pensada per a eixides més fredes, amb una lectura més clara de la part superior i la franja central del club.",
  },
  {
    title: "Variant blanca",
    image: "/equipacions/08-varo.jpeg",
    description:
      "Una versió més viva i amb presència de blau cel, ideal per a donar varietat dins de la mateixa línia d&apos;equipació.",
  },
];

const videoCards = [
  {
    title: "Presentació de la peça",
    src: "/equipacions/videos/01-presentacio.mp4",
    description:
      "Vídeo de presentació per a veure el conjunt general i la lectura del color blau en moviment.",
  },
  {
    title: "Detall de materials",
    src: "/equipacions/videos/02-detall.mp4",
    description:
      "Un segon pla per a apreciar millor els acabats, la textura i el contrast entre el blanc i el marí.",
  },
  {
    title: "Vista de moviment",
    src: "/equipacions/videos/03-detall-2.mp4",
    description:
      "La peça en moviment ajuda a veure com treballa el degradat i com cau el teixit sobre el cos.",
  },
];

export default function EquipacionsPage() {
  return (
    <div className="page">
      <section className="hero hero--equipacions">
        <div className="container hero__grid hero__grid--equipacions">
          <div className="hero__copy">
            <span className="eyebrow">Equipacions</span>
            <h1>El blau del club en la carretera.</h1>
            <p className="lead">
              Una proposta d&apos;equipació pensada per a identificar al Club Ciclista La Punxaeta
              amb una imatge neta, actual i fàcil de reconéixer en marxa.
            </p>
            <div className="hero__meta">
              <span>Blau cel</span>
              <span>Marí profund</span>
              <span>Base blanca</span>
            </div>
            <div className="hero__actions">
              <Link className="button button--primary" href="/rutas">
                Veure rutes
              </Link>
              <Link className="button button--secondary" href="/carrera-ciclista">
                Veure trofeu
              </Link>
            </div>
          </div>

          <aside className="panel panel--featured equipacions-hero__panel">
            <span className="panel__label">Identitat visual</span>
            <h2>La gamma cromàtica parteix del blau clar més reconeixible del club.</h2>
            <p>
              La col·lecció combina una base clara amb marí intens i blau cel, buscant un equilibri
              entre elegància i visibilitat. El resultat és una equipació sòbria però amb molta
              personalitat, pensada per a rodar, competir i representar el club amb orgull.
            </p>
            <div className="equipacions-swatches" aria-label="Paleta principal">
              <span>
                <i className="equipacions-swatches__dot equipacions-swatches__dot--light" />
                Blau cel
              </span>
              <span>
                <i className="equipacions-swatches__dot equipacions-swatches__dot--navy" />
                Marí
              </span>
              <span>
                <i className="equipacions-swatches__dot equipacions-swatches__dot--white" />
                Blanc
              </span>
            </div>
          </aside>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <div className="section__header section__header--split">
            <div>
              <span className="eyebrow">Conjunt principal</span>
              <h2>La imatge que ens identifica sobre la bici.</h2>
            </div>
            <p className="equipacions-intro">
              El bloc central mostra la lectura completa del mallot i com el blau del club domina
              la part baixa i les zones de transició.
            </p>
          </div>

          <div className="equipacions-featured-grid">
            <article className="panel equipacions-featured">
              <div className="equipacions-featured__media">
                <Image
                  src="/equipacions/09-frontal-2.jpeg"
                  alt="Maillot principal del Club Ciclista La Punxaeta vist de front"
                  fill
                  sizes="(max-width: 980px) 100vw, 50vw"
                />
              </div>
              <div className="equipacions-featured__copy">
                <span className="pill">Frontal</span>
                <h3>Maillot principal</h3>
                <p>
                  El frontal concentra el contrast entre el blanc superior, la franja marina i el
                  blau cel inferior. És la imatge més clara de la col·lecció i la que millor
                  resumeix el caràcter del club.
                </p>
              </div>
            </article>

            <article className="panel equipacions-featured">
              <div className="equipacions-featured__media">
                <Image
                  src="/equipacions/10-trasera-2.jpeg"
                  alt="Maillot principal del Club Ciclista La Punxaeta vist de darrere"
                  fill
                  sizes="(max-width: 980px) 100vw, 50vw"
                />
              </div>
              <div className="equipacions-featured__copy">
                <span className="pill pill--subtle">Posterior</span>
                <h3>Lectura posterior</h3>
                <p>
                  La part de darrere manté la mateixa línia visual perquè, en grup i en marxa,
                  la identitat siga recognoscible des de qualsevol angle.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__header">
            <span className="eyebrow">Peces</span>
            <h2>Catàleg de peces i complements.</h2>
          </div>

          <div className="equipacions-gallery">
            {garmentCards.map((item) => (
              <article key={item.title} className="equipacions-card">
                <div className="equipacions-card__media">
                  <Image src={item.image} alt={item.title} fill sizes="(max-width: 980px) 100vw, 33vw" />
                </div>
                <div className="equipacions-card__copy">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <div className="section__header section__header--split">
            <div>
              <span className="eyebrow">Vídeos</span>
              <h2>La peça en moviment.</h2>
            </div>
            <p className="equipacions-intro">
              Els vídeos ajuden a veure el comportament dels teixits, el volum de les peces i la
              lectura real de la paleta quan el cos es mou sobre la bici.
            </p>
          </div>

          <div className="equipacions-videos">
            {videoCards.map((item) => (
              <article key={item.title} className="equipacions-video">
                <video className="equipacions-video__media" controls preload="metadata">
                  <source src={item.src} type="video/mp4" />
                  El teu navegador no pot reproduir este vídeo.
                </video>
                <div className="equipacions-video__copy">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
