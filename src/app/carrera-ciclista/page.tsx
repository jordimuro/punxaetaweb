export default function CarreraCiclistaPage() {
  return (
    <div className="page">
      <section className="section">
        <div className="container">
          <div className="page-head page-head--split">
            <div>
              <span className="eyebrow">Trofeu Vila de Muro-Punxaeta</span>
              <h1>Segona edició</h1>
            </div>
            <span className="pill">Diumenge, 6 de setembre de 2026 · 9:00 h</span>
          </div>

          <div className="route-detail__grid">
            <article className="panel panel--featured">
              <span className="panel__label">Presentació</span>
              <h2>Una jornada de ciclisme base i formació al cor de Muro.</h2>
              <p>
                El Club Ciclista La Punxaeta presenta la segona edició del Trofeu Vila de
                Muro-Punxaeta, una prova pensada per a reunir escoles de ciclisme, categories
                cadet masculí i femení, i juniors femenines en una matinal esportiva plena
                d&apos;ambient, esforç i il·lusió.
              </p>
              <p>
                La cita serà el diumenge 6 de setembre de 2026 a les 9:00 del matí, amb una
                proposta que vol continuar creixent i consolidar-se com una jornada de referència
                per al ciclisme formatiu de la zona.
              </p>
              <dl className="stats stats--stacked">
                <div>
                  <dt>Prova</dt>
                  <dd>Segona edició del Trofeu Vila de Muro-Punxaeta</dd>
                </div>
                <div>
                  <dt>Categories</dt>
                  <dd>Escoles de ciclisme, cadets xics, xiques i júniors femines</dd>
                </div>
                <div>
                  <dt>Data i hora</dt>
                  <dd>Diumenge, 6 de setembre de 2026 · 9:00 h</dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>Matinal ciclista amb participació formativa i esperit de club</dd>
                </div>
              </dl>
            </article>

            <aside className="panel panel--accent">
              <span className="panel__label">Objectiu</span>
              <h2>Promocionar el ciclisme de base i donar visibilitat al club.</h2>
              <p>
                El trofeu naix amb la voluntat de crear una cita atractiva, ordenada i pròxima,
                on els més menuts i les categories de formació puguen gaudir d&apos;una jornada
                esportiva ben organitzada, amb ambient de club i suport del públic local.
              </p>
              <div className="notes">
                <p>
                  En esta pàgina es podrà ampliar més avant tota la informació del programa,
                  recorreguts, horaris i detalls organitzatius de la prova.
                </p>
              </div>
            </aside>
          </div>

          <section className="panel" style={{ marginTop: "1rem" }}>
            <span className="panel__label">Detalls</span>
            <h2>Una jornada per a gaudir del ciclisme i fer créixer la prova any rere any.</h2>
            <p>
              La segona edició del Trofeu Vila de Muro-Punxaeta vol ser un punt de trobada entre
              esport, formació i afició. L&apos;ambient al matí, la participació de les escoles i
              la presència de cadets i júniors reforcen una proposta pensada per a consolidar-se
              dins del calendari ciclista local.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
