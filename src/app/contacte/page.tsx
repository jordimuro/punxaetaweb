export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <div className="page-head">
            <span className="eyebrow">Contacte</span>
            <h1>Parlem</h1>
            <p className="lead">
              Si vols fer-nos arribar una consulta, proposar una ruta o preguntar per les
              equipacions, ací tens les dades bàsiques del club.
            </p>
          </div>

          <div className="grid grid--3">
            <article className="panel">
              <span className="panel__label">Club</span>
              <h2>Club Ciclista La Punxaeta</h2>
              <p>Muro, Alacant.</p>
            </article>

            <article className="panel">
              <span className="panel__label">Instagram</span>
              <h2>
                <a href="https://www.instagram.com/lapunxaeta/" target="_blank" rel="noreferrer">
                  @lapunxaeta
                </a>
              </h2>
              <p>Notícies, novetats i imatges del dia a dia del club.</p>
            </article>
          </div>

          <div className="panel contact-card">
            <span className="panel__label">Més informació</span>
            <div className="contact-card__content">
              <div>
                <h2>Informació del club</h2>
                <p>
                  El club treballa rutes setmanals, el Trofeu Vila de Muro-Punxaeta i la
                  secció d&apos;equipacions. Si vols col·laborar o rebre més detalls, pots
                  contactar-nos per Instagram o enviar-nos un correu a{" "}
                  <a href="mailto:lapunxaetamuro@gmail.com">lapunxaetamuro@gmail.com</a>.
                </p>
              </div>
              <ul className="contact-card__list">
                <li>
                  <strong>Localitat</strong>
                  <span>Muro</span>
                </li>
                <li>
                  <strong>Província</strong>
                  <span>Alacant</span>
                </li>
                <li>
                  <strong>Xarxa</strong>
                  <span>Instagram del club</span>
                </li>
                <li>
                  <strong>Correu</strong>
                  <span>
                    <a href="mailto:lapunxaetamuro@gmail.com">lapunxaetamuro@gmail.com</a>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
