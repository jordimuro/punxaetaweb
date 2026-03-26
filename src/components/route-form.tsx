"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthOnly } from "@/components/auth";
import type { RouteFormState, RouteFormValues } from "@/lib/routes";

type RouteFormProps = {
  action: (state: RouteFormState, formData: FormData) => Promise<RouteFormState>;
  initialValues: RouteFormValues;
  title: string;
  submitLabel: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="field__error">{message}</p>;
}

export function RouteForm({ action, initialValues, title, submitLabel }: RouteFormProps) {
  const [state, formAction, isPending] = useActionState(action, {
    values: initialValues,
    errors: {},
  });
  const formKey = JSON.stringify(state.values);

  return (
    <AuthOnly
      fallback={
        <div className="panel auth-gate">
          <span className="panel__label">Accés privat</span>
          <h2>Inicia sessió per a crear o editar rutes.</h2>
          <p>
            Les funcions de manteniment només apareixen per a l&apos;usuari autoritzat.
          </p>
          <div className="form-actions">
            <Link className="button button--secondary" href="/rutas">
              Tornar al llistat
            </Link>
            <Link className="button button--primary" href="/login">
              Iniciar sessió
            </Link>
          </div>
        </div>
      }
    >
      <div className="form-shell">
        <div className="page-head page-head--tight">
          <span className="eyebrow">Ruta</span>
          <h1>{title}</h1>
        </div>

        <form key={formKey} action={formAction} className="form-card">
          <input type="hidden" name="id" defaultValue={state.values.id} />
          <input type="hidden" name="originalSlug" defaultValue={state.values.originalSlug} />

          {state.formError ? <p className="form__alert">{state.formError}</p> : null}

          <div className="form-grid">
            <label className="field">
              <span>Slug URL</span>
              <input name="slug" defaultValue={state.values.slug} placeholder="nom-de-la-ruta" />
              <FieldError message={state.errors.slug} />
            </label>

            <label className="field">
              <span>Nom</span>
              <input name="name" defaultValue={state.values.name} placeholder="Nom de la ruta" />
              <FieldError message={state.errors.name} />
            </label>

            <label className="field">
              <span>Data</span>
              <input type="date" name="date" defaultValue={state.values.date} />
              <FieldError message={state.errors.date} />
            </label>

            <label className="field">
              <span>Població</span>
              <input name="town" defaultValue={state.values.town} placeholder="Muro, Cocentaina..." />
              <FieldError message={state.errors.town} />
            </label>

            <label className="field">
              <span>Lloc d&apos;esmorzar</span>
              <input
                name="breakfastPlace"
                defaultValue={state.values.breakfastPlace}
                placeholder="Bar, poble o punt d'esmorzar"
              />
              <FieldError message={state.errors.breakfastPlace} />
            </label>

            <label className="field">
              <span>Distància fins a esmorzar</span>
              <input
                type="number"
                name="distanceToBreakfast"
                defaultValue={state.values.distanceToBreakfast}
                min="0"
                step="1"
                placeholder="Km fins a esmorzar"
              />
              <FieldError message={state.errors.distanceToBreakfast} />
            </label>

            <label className="field">
              <span>Desnivell fins a esmorzar</span>
              <input
                type="number"
                name="elevationToBreakfast"
                defaultValue={state.values.elevationToBreakfast}
                min="0"
                step="1"
                placeholder="Metres fins a esmorzar"
              />
              <FieldError message={state.errors.elevationToBreakfast} />
            </label>

            <label className="field">
              <span>Punt d&apos;eixida</span>
              <input
                name="meetingPoint"
                defaultValue={state.values.meetingPoint}
                placeholder="Punt d'eixida"
              />
              <FieldError message={state.errors.meetingPoint} />
            </label>

            <label className="field">
              <span>Eixida 1</span>
              <input name="departureTimeOne" defaultValue={state.values.departureTimeOne} placeholder="08:00" />
              <FieldError message={state.errors.departureTimeOne} />
            </label>

            <label className="field">
              <span>Eixida 2</span>
              <input name="departureTimeTwo" defaultValue={state.values.departureTimeTwo} placeholder="08:30" />
            </label>

            <label className="field">
              <span>Kms</span>
              <input type="number" name="kms" defaultValue={state.values.kms} min="0" step="1" />
              <FieldError message={state.errors.kms} />
            </label>

            <label className="field">
              <span>Desnivell total</span>
              <input
                type="number"
                name="elevationGain"
                defaultValue={state.values.elevationGain}
                min="0"
                step="1"
              />
              <FieldError message={state.errors.elevationGain} />
            </label>

            <label className="field field--full">
              <span>Recorregut</span>
              <textarea
                name="notes"
                defaultValue={state.values.notes}
                rows={5}
                placeholder="Itinerari, variants, observacions..."
              />
              <FieldError message={state.errors.notes} />
            </label>
          </div>

          <div className="form-actions">
            <Link className="button button--secondary" href="/rutas">
              Cancel·lar
            </Link>
            <button className="button button--primary" type="submit" disabled={isPending}>
              {isPending ? "Guardant..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </AuthOnly>
  );
}
