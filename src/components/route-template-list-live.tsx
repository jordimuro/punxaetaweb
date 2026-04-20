"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type RouteTemplateListItem = {
  slug: string;
  name: string;
  town: string;
  kms: number;
  elevationGain: number;
  gpxFileName?: string | null;
  gpxFileNameSecondary?: string | null;
  breakfastPlace: string;
  meetingPoint: string;
  notes: string;
};

type RouteTemplateListLiveProps = {
  templates: RouteTemplateListItem[];
};

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("ca-ES")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function templateMatchesQuery(template: RouteTemplateListItem, query: string) {
  if (!query) {
    return true;
  }

  const queryNormalized = normalizeSearchText(query);
  const searchable = [
    template.name,
    template.town,
    template.breakfastPlace,
    template.meetingPoint,
    template.notes,
    template.slug,
  ]
    .map(normalizeSearchText)
    .join(" ");

  return searchable.includes(queryNormalized);
}

export function RouteTemplateListLive({ templates }: RouteTemplateListLiveProps) {
  const [query, setQuery] = useState("");

  const filteredTemplates = useMemo(
    () => templates.filter((template) => templateMatchesQuery(template, query.trim())),
    [templates, query],
  );

  return (
    <>
      <div className="route-filters" aria-label="Buscador de rutes base">
        <div className="route-filters__row route-filters__row--single">
          <label className="route-filters__search">
            <span>Buscar ruta base</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Nom, població o punt d'eixida..."
            />
          </label>
        </div>
      </div>

      <div className="route-template-list">
        <div className="route-template-head" aria-hidden="true">
          <span>Número</span>
          <span>Nom</span>
          <span>Distància</span>
          <span>Desnivell</span>
          <span>Altimetria</span>
          <span className="route-template-head__detail">Detall</span>
        </div>
        {filteredTemplates.map((template, index) => (
          <article key={template.slug} className="route-template-row">
            {(() => {
              const hasAltimetria = template.gpxFileName || template.gpxFileNameSecondary;
              return (
                <>
                  <span className="route-template-row__index">{index + 1}</span>
                  <strong className="route-template-row__name">{template.name}</strong>
                  <span className="route-template-row__col route-template-row__col--metric route-template-row__distance">
                    {template.kms} km
                  </span>
                  <span className="route-template-row__col route-template-row__col--metric route-template-row__elevation">
                    {template.elevationGain} m
                  </span>
                  <span className="route-template-row__col route-template-row__gpx route-template-row__has-gpx">
                    {hasAltimetria ? "Sí" : "No"}
                  </span>
                  <span className="route-template-row__mobile-meta">
                    Distància: {template.kms} km / Desnivell: {template.elevationGain} m / Altimetria:{" "}
                    {hasAltimetria ? "Sí" : "No"}
                  </span>
                  <Link
                    className="button button--secondary button--small route-template-row__detail"
                    href={`/rutas/llistat/${template.slug}`}
                  >
                    Detall
                  </Link>
                </>
              );
            })()}
          </article>
        ))}
      </div>

      {filteredTemplates.length === 0 ? (
        <p className="route-detail__empty">No hi ha rutes base que coincidisquen amb el filtre.</p>
      ) : null}
    </>
  );
}
