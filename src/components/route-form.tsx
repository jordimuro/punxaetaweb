"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AuthOnly } from "@/components/auth";
import type { RouteFormState, RouteFormValues } from "@/lib/routes";

type RouteFormProps = {
  action: (state: RouteFormState, formData: FormData) => Promise<RouteFormState>;
  initialValues: RouteFormValues;
  title: string;
  submitLabel: string;
  templateOptions?: Array<{
    slug: string;
    name: string;
    routeType: "ruta" | "cicloturista";
  }>;
  templateSelection?: string;
};

function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="field__error">
      {message}
    </p>
  );
}

export function RouteForm({
  action,
  initialValues,
  title,
  submitLabel,
  templateOptions = [],
  templateSelection = "",
}: RouteFormProps) {
  const [state, formAction, isPending] = useActionState(action, {
    values: initialValues,
    errors: {},
  });
  const [routeType, setRouteType] = useState<"ruta" | "cicloturista">(initialValues.routeType);
  const formKey = JSON.stringify(state.values);
  const dateError = state.errors.date;
  const isCicloturista = routeType === "cicloturista";
  const canLoadFromDatabase = !state.values.id;

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
        {canLoadFromDatabase ? (
          <div className="panel route-template-loader">
            <span className="panel__label">Des de DB</span>
            <h2>Crear nova ruta des de la base de dades del club</h2>
            <form method="get" className="route-template-loader__form">
              <label className="field">
                <span>Ruta base guardada</span>
                <select name="plantilla" defaultValue={templateSelection}>
                  <option value="">Selecciona una ruta base...</option>
                  {templateOptions.map((template) => (
                    <option key={template.slug} value={template.slug}>
                      {template.name} · {template.routeType === "cicloturista" ? "Marxa cicloturista" : "Ruta del club"}
                    </option>
                  ))}
                </select>
              </label>
              <div className="route-template-loader__actions">
                <button type="submit" className="button button--secondary" disabled={templateOptions.length === 0}>
                  Carregar dades
                </button>
                <Link className="text-link" href="/rutas/llistat">
                  Gestionar DB de rutes
                </Link>
                {templateOptions.length === 0 ? (
                  <span className="route-template-loader__empty">
                    Encara no hi ha rutes en la DB. Crea la primera en Llistat Rutes.
                  </span>
                ) : null}
              </div>
            </form>
          </div>
        ) : null}

        <div className="page-head page-head--tight">
          <span className="eyebrow">Ruta</span>
          <h1>{title}</h1>
        </div>

        <form key={formKey} action={formAction} className="form-card">
          <input type="hidden" name="id" defaultValue={state.values.id} />
          <input type="hidden" name="originalSlug" defaultValue={state.values.originalSlug} />
          <input type="hidden" name="gpxFileName" defaultValue={state.values.gpxFileName} />
          <input type="hidden" name="gpxPath" defaultValue={state.values.gpxPath} />
          <textarea hidden readOnly name="gpxContent" value={state.values.gpxContent} />
          <input type="hidden" name="gpxFileNameSecondary" defaultValue={state.values.gpxFileNameSecondary} />
          <input type="hidden" name="gpxPathSecondary" defaultValue={state.values.gpxPathSecondary} />
          <textarea hidden readOnly name="gpxContentSecondary" value={state.values.gpxContentSecondary} />

          {state.formError ? <p className="form__alert">{state.formError}</p> : null}

          <div className="form-grid">
            <label className="field">
              <span>Tipus</span>
              <select
                name="routeType"
                defaultValue={state.values.routeType}
                onChange={(event) =>
                  setRouteType(
                    event.currentTarget.value === "cicloturista" ? "cicloturista" : "ruta",
                  )
                }
              >
                <option value="ruta">Ruta del club</option>
                <option value="cicloturista">Marxa cicloturista</option>
              </select>
              <FieldError message={state.errors.routeType} />
            </label>

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
              <input
                type="date"
                name="date"
                defaultValue={state.values.date}
                className={dateError ? "field-input--error" : undefined}
                aria-invalid={Boolean(dateError)}
                aria-describedby={dateError ? "route-date-error" : undefined}
              />
              <FieldError id="route-date-error" message={dateError} />
            </label>

            <label className="field">
              <span>Població</span>
              <input name="town" defaultValue={state.values.town} placeholder="Muro, Cocentaina..." />
              <FieldError message={state.errors.town} />
            </label>

            <label className="field field--full field--check">
              <span className="field__checkbox">
                <input
                  type="checkbox"
                  name="showInSharedCalendar"
                  value="1"
                  defaultChecked={state.values.showInSharedCalendar}
                />
                Mostrar al calendari compartit (.ics)
              </span>
            </label>

            {isCicloturista ? (
              <label className="field field--full">
                <span>Web oficial de la marxa</span>
                <input
                  name="externalUrl"
                  type="url"
                  defaultValue={state.values.externalUrl}
                  placeholder="https://..."
                />
                <FieldError message={state.errors.externalUrl} />
              </label>
            ) : (
              <label className="field">
                <span>Lloc d&apos;esmorzar</span>
                <input
                  name="breakfastPlace"
                  defaultValue={state.values.breakfastPlace}
                  placeholder="Bar, poble o punt d'esmorzar"
                />
                <FieldError message={state.errors.breakfastPlace} />
              </label>
            )}

            {!isCicloturista ? (
              <>
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
              </>
            ) : (
              <>
                <input type="hidden" name="breakfastPlace" value={state.values.breakfastPlace || "Marxa cicloturista"} />
                <input type="hidden" name="distanceToBreakfast" value="0" />
                <input type="hidden" name="elevationToBreakfast" value="0" />
              </>
            )}

            {isCicloturista ? (
              <>
                <label className="field field--full">
                  <span>Nom recorregut 1</span>
                  <input
                    name="gpxRouteName"
                    defaultValue={state.values.gpxRouteName || "Recorregut 1"}
                    placeholder="Recorregut 1"
                  />
                  <FieldError message={state.errors.gpxRouteName} />
                </label>

                <label className="field">
                  <span>Punt d&apos;eixida recorregut 1</span>
                  <input
                    name="meetingPoint"
                    defaultValue={state.values.meetingPoint}
                    placeholder="Punt d'eixida recorregut 1"
                  />
                  <FieldError message={state.errors.meetingPoint} />
                </label>

                <label className="field">
                  <span>Hora d&apos;eixida recorregut 1</span>
                  <input name="departureTimeOne" defaultValue={state.values.departureTimeOne} placeholder="08:00" />
                  <FieldError message={state.errors.departureTimeOne} />
                </label>

                <label className="field">
                  <span>Kms recorregut 1</span>
                  <input type="number" name="kms" defaultValue={state.values.kms} min="0" step="1" />
                  <FieldError message={state.errors.kms} />
                </label>

                <label className="field">
                  <span>Desnivell recorregut 1</span>
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
                  <span>Nom recorregut 2</span>
                  <input
                    name="gpxRouteNameSecondary"
                    defaultValue={state.values.gpxRouteNameSecondary}
                    placeholder="Opcional"
                  />
                  <FieldError message={state.errors.gpxRouteNameSecondary} />
                </label>

                <label className="field">
                  <span>Punt d&apos;eixida recorregut 2</span>
                  <input
                    name="meetingPointSecondary"
                    defaultValue={state.values.meetingPointSecondary}
                    placeholder="Punt d'eixida recorregut 2"
                  />
                  <FieldError message={state.errors.meetingPointSecondary} />
                </label>

                <label className="field">
                  <span>Hora d&apos;eixida recorregut 2</span>
                  <input
                    name="departureTimeSecondary"
                    defaultValue={state.values.departureTimeSecondary}
                    placeholder="08:15"
                  />
                  <FieldError message={state.errors.departureTimeSecondary} />
                </label>

                <label className="field">
                  <span>Kms recorregut 2</span>
                  <input type="number" name="kmsSecondary" defaultValue={state.values.kmsSecondary} min="0" step="1" />
                  <FieldError message={state.errors.kmsSecondary} />
                </label>

                <label className="field">
                  <span>Desnivell recorregut 2</span>
                  <input
                    type="number"
                    name="elevationGainSecondary"
                    defaultValue={state.values.elevationGainSecondary}
                    min="0"
                    step="1"
                  />
                  <FieldError message={state.errors.elevationGainSecondary} />
                </label>

                <input type="hidden" name="departureTimeTwo" value="" />
              </>
            ) : (
              <>
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
                  <span>Hora d&apos;eixida</span>
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

                <input type="hidden" name="meetingPointSecondary" value="" />
                <input type="hidden" name="departureTimeSecondary" value="" />
                <input type="hidden" name="kmsSecondary" value="" />
                <input type="hidden" name="elevationGainSecondary" value="" />
                <input type="hidden" name="gpxRouteNameSecondary" value="" />

                <label className="field field--full">
                  <span>Nom recorregut 1</span>
                  <input
                    name="gpxRouteName"
                    defaultValue={state.values.gpxRouteName || "Recorregut principal"}
                    placeholder="Recorregut principal"
                  />
                  <FieldError message={state.errors.gpxRouteName} />
                </label>
              </>
            )}

            {isCicloturista ? (
              <input type="hidden" name="notes" value={state.values.notes} />
            ) : (
              <label className="field field--full">
                <span>Descripció</span>
                <textarea
                  name="notes"
                  defaultValue={state.values.notes}
                  rows={5}
                  placeholder="Itinerari, variants, observacions..."
                />
                <FieldError message={state.errors.notes} />
              </label>
            )}

            <label className={isCicloturista ? "field" : "field field--full"}>
              <span>{isCicloturista ? "GPX recorregut 1 (opcional)" : "Fitxer GPX (opcional)"}</span>
              <input
                type="file"
                name="gpxFile"
                accept=".gpx,application/gpx+xml,application/xml,text/xml"
              />
              {state.values.gpxFileName ? (
                <small className="field__hint">GPX actual: {state.values.gpxFileName}</small>
              ) : (
                <small className="field__hint">Pots afegir el GPX ara o en una edició posterior.</small>
              )}
            </label>

            {isCicloturista ? (
              <>
                <label className="field">
                  <span>GPX recorregut 2 (opcional)</span>
                  <input
                    type="file"
                    name="gpxFileSecondary"
                    accept=".gpx,application/gpx+xml,application/xml,text/xml"
                  />
                  {state.values.gpxFileNameSecondary ? (
                    <small className="field__hint">GPX actual: {state.values.gpxFileNameSecondary}</small>
                  ) : (
                    <small className="field__hint">Pots afegir el segon GPX ara o en una edició posterior.</small>
                  )}
                </label>
              </>
            ) : null}
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
