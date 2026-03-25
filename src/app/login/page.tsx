"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LoginStatusCard, useAuth } from "@/components/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, ready } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const ok = login(username, password);

    if (!ok) {
      setMessage("Credencials incorrectes. Revisa l'usuari i la contrasenya.");
      setIsSubmitting(false);
      return;
    }

    setMessage("Sessió iniciada correctament.");
    router.replace("/rutas");
    router.refresh();
  }

  return (
    <div className="page login-page">
      <section className="section">
        <div className="container">
          <div className="page-head">
            <span className="eyebrow">Accés privat</span>
            <h1>Inicia sessió</h1>
            <p className="lead">
              Només el personal autoritzat pot crear, editar i pujar GPX de les rutes.
            </p>
          </div>

          <div className="login-page__grid">
            <article className="panel login-panel">
              <span className="panel__label">Accés privat</span>
              <h2>Entrada d&apos;administració de la web</h2>
              <p>
                Quan la sessió estiga oberta, apareixeran els botons de creació, edició,
                eliminació i pujada de GPX.
              </p>

              {message ? <p className="form__alert">{message}</p> : null}

              {!ready ? (
                <p className="route-detail__empty">Carregant estat de sessió...</p>
              ) : (
                <form className="login-form" onSubmit={handleSubmit}>
                  <label className="field">
                    <span>Usuari</span>
                    <input
                      name="username"
                      autoComplete="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Introdueix l'usuari"
                    />
                  </label>

                  <label className="field">
                    <span>Contrasenya</span>
                    <input
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Introdueix la contrasenya"
                    />
                  </label>

                  <div className="form-actions">
                    <Link className="button button--secondary" href="/">
                      Tornar a l&apos;inici
                    </Link>
                    <button className="button button--primary" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Entrant..." : "Entrar"}
                    </button>
                  </div>
                </form>
              )}
            </article>

            <div className="login-page__side">
              <LoginStatusCard />
              <aside className="panel panel--accent login-page__note">
                <span className="panel__label">Accés</span>
                <h2>{isAuthenticated ? "Sessió oberta." : "Sessió tancada."}</h2>
                <p>
                  Quan t&apos;identifiques correctament, la web mostra les opcions de gestió de
                  rutes i la pujada del GPX només en les fitxes privades.
                </p>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
