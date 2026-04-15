"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMapEvents,
  useMap,
} from "react-leaflet";

type GpxPoint = {
  lat: number;
  lon: number;
  ele: number | null;
};

type GpxViewerProps = {
  gpxContent?: string | null;
  gpxFileName?: string | null;
};

type ParsedGpx = {
  points: GpxPoint[];
  error: string | null;
};

type TrackPoint = {
  lat: number;
  lon: number;
  ele: number;
  distance: number;
  sourceIndex: number;
};

type ProfilePoint = TrackPoint & {
  x: number;
  y: number;
};

type ProfileModel = {
  hasData: boolean;
  pathD: string;
  maxElevation: number;
  minElevation: number;
  maxDistance: number;
  trackPoints: TrackPoint[];
  points: ProfilePoint[];
};

const PROFILE_PADDING_LEFT = 4;
const PROFILE_PADDING_RIGHT = 4;
const PROFILE_PADDING_TOP = 8;
const PROFILE_PADDING_BOTTOM = 40;
const PROFILE_VIEWBOX_WIDTH = 160;
const PROFILE_VIEWBOX_HEIGHT = 50;
const PROFILE_CHART_WIDTH = PROFILE_VIEWBOX_WIDTH - PROFILE_PADDING_LEFT - PROFILE_PADDING_RIGHT;
const PROFILE_CHART_HEIGHT = PROFILE_PADDING_BOTTOM - PROFILE_PADDING_TOP;

type TileStyleOption = {
  id: string;
  label: string;
  url: string;
  attribution: string;
  maxZoom?: number;
};

const TILE_STYLE_OPTIONS: TileStyleOption[] = [
  {
    id: "carto-voyager",
    label: "Carto Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  {
    id: "osm-standard",
    label: "OSM Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  {
    id: "osm-hot",
    label: "OSM Humanitarian",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France',
    maxZoom: 20,
  },
  {
    id: "opentopomap",
    label: "OpenTopoMap",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
  {
    id: "esri-world-imagery",
    label: "Satélite (Esri)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
];

function extractPoints(xmlText: string): ParsedGpx {
  const parser = new DOMParser();
  const document = parser.parseFromString(xmlText, "application/xml");
  const parserError = document.querySelector("parsererror");

  if (parserError) {
    return { points: [], error: "No s'ha pogut llegir el fitxer GPX." };
  }

  const nodes = [
    ...Array.from(document.querySelectorAll("trkpt")),
    ...Array.from(document.querySelectorAll("rtept")),
  ];

  const points = nodes
    .map((node) => {
      const lat = Number(node.getAttribute("lat"));
      const lon = Number(node.getAttribute("lon"));
      const eleText = node.querySelector("ele")?.textContent ?? "";
      const ele = eleText.trim() ? Number(eleText) : null;

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      return { lat, lon, ele: Number.isFinite(ele ?? NaN) ? ele : null };
    })
    .filter((point): point is GpxPoint => point !== null);

  if (points.length < 2) {
    return { points: [], error: "El GPX no conté prou punts per a dibuixar una ruta." };
  }

  return { points, error: null };
}

function haversineDistance(left: GpxPoint, right: GpxPoint) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(right.lat - left.lat);
  const deltaLon = toRadians(right.lon - left.lon);
  const lat1 = toRadians(left.lat);
  const lat2 = toRadians(right.lat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.sin(deltaLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

function buildProfile(points: GpxPoint[]): ProfileModel {
  const trackPoints: TrackPoint[] = [];
  let distance = 0;

  points.forEach((point, index) => {
    if (typeof point.ele !== "number") {
      return;
    }

    if (trackPoints.length > 0) {
      let previousIndex = index - 1;
      while (previousIndex >= 0 && typeof points[previousIndex].ele !== "number") {
        previousIndex -= 1;
      }

      if (previousIndex >= 0) {
        distance += haversineDistance(points[previousIndex], point);
      }
    }

    trackPoints.push({
      lat: point.lat,
      lon: point.lon,
      ele: point.ele,
      distance,
      sourceIndex: index,
    });
  });

  if (trackPoints.length < 2) {
    return {
      hasData: false,
      pathD: "",
      maxElevation: 0,
      minElevation: 0,
      maxDistance: 0,
      trackPoints: [],
      points: [],
    };
  }

  const elevations = trackPoints
    .map((point) => point.ele)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const maxDistance = trackPoints[trackPoints.length - 1]?.distance ?? 0;
  const maxElevation = Math.max(...elevations);
  const minElevation = Math.min(...elevations);
  const distanceSpan = Math.max(maxDistance, 0.000001);
  const elevationSpan = Math.max(maxElevation - minElevation, 0.000001);
  const mappedPoints = trackPoints.map((point) => {
    const x = (point.distance / distanceSpan) * PROFILE_CHART_WIDTH + PROFILE_PADDING_LEFT;
    const y = (1 - (point.ele - minElevation) / elevationSpan) * PROFILE_CHART_HEIGHT + PROFILE_PADDING_TOP;
    return { ...point, x, y };
  });

  const pathD = mappedPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  return {
    hasData: true,
    pathD,
    maxElevation,
    minElevation,
    maxDistance,
    trackPoints,
    points: mappedPoints,
  };
}

function ZoomButtons({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  const fitToPoints = () => {
    if (!points.length) {
      return;
    }

    map.fitBounds(points, { padding: [28, 28] });
  };

  return (
    <div className="gpx-map__controls">
      <button type="button" className="button button--secondary button--small" onClick={() => map.zoomIn()}>
        +
      </button>
      <button type="button" className="button button--secondary button--small" onClick={() => map.zoomOut()}>
        -
      </button>
      <button type="button" className="button button--secondary button--small" onClick={fitToPoints}>
        Centrar
      </button>
    </div>
  );
}

type MapLayerProps = {
  points: GpxPoint[];
  activeDistance: number | null;
  onActiveDistanceChange: (distance: number | null) => void;
};

function GpxMapLayer({ points, activeDistance, onActiveDistanceChange }: MapLayerProps) {
  const latLngPoints = useMemo(
    () => points.map((point) => [point.lat, point.lon] as [number, number]),
    [points],
  );
  const firstPoint = latLngPoints[0];
  const lastPoint = latLngPoints[latLngPoints.length - 1];
  const map = useMap();

  useMapEvents({
    mousemove(event) {
      const cursorPoint = event.containerPoint;
      let closestDistance = Number.POSITIVE_INFINITY;
      let closestPoint: GpxPoint | null = null;
      let cumulativeDistance = 0;
      let bestDistance = 0;

      points.forEach((point, index) => {
        const pointPosition = map.latLngToContainerPoint([point.lat, point.lon]);
        const delta = pointPosition.distanceTo(cursorPoint);

        if (delta < closestDistance) {
          closestDistance = delta;
          closestPoint = point;
          bestDistance = points
            .slice(0, index + 1)
            .reduce((acc, current, currentIndex, array) => {
              if (currentIndex === 0) {
                return 0;
              }

              const previous = array[currentIndex - 1];
              return acc + haversineDistance(previous, current);
            }, 0);
        }
      });

      if (!closestPoint) {
        return;
      }

      if (closestDistance > 28) {
        onActiveDistanceChange(null);
        return;
      }

      cumulativeDistance = bestDistance;
      onActiveDistanceChange(cumulativeDistance);
    },
    mouseout() {
      onActiveDistanceChange(null);
    },
    click(event) {
      const cursorPoint = event.containerPoint;
      let closestDistance = Number.POSITIVE_INFINITY;
      let bestDistance = 0;

      points.forEach((point, index) => {
        const pointPosition = map.latLngToContainerPoint([point.lat, point.lon]);
        const delta = pointPosition.distanceTo(cursorPoint);

        if (delta < closestDistance) {
          closestDistance = delta;
          bestDistance = points
            .slice(0, index + 1)
            .reduce((acc, current, currentIndex, array) => {
              if (currentIndex === 0) {
                return 0;
              }

              const previous = array[currentIndex - 1];
              return acc + haversineDistance(previous, current);
            }, 0);
        }
      });

      if (closestDistance > 28) {
        return;
      }

      onActiveDistanceChange(bestDistance);
    },
  });

  if (!firstPoint || !lastPoint) {
    return null;
  }

  return (
    <>
      <ZoomButtons points={latLngPoints} />
      <Polyline positions={latLngPoints} pathOptions={{ color: "#12355a", weight: 4, opacity: 0.9 }} />
      <CircleMarker
        center={firstPoint}
        radius={7}
        pathOptions={{ color: "#12355a", fillColor: "#12355a", fillOpacity: 1, weight: 2 }}
      >
        <Tooltip permanent direction="top" offset={[0, -2]}>
          Inici
        </Tooltip>
      </CircleMarker>
      <CircleMarker
        center={lastPoint}
        radius={7}
        pathOptions={{ color: "#5fb4e7", fillColor: "#5fb4e7", fillOpacity: 1, weight: 2 }}
      >
        <Tooltip permanent direction="top" offset={[0, -2]}>
          Final
        </Tooltip>
      </CircleMarker>
      {activeDistance !== null ? (
        <ActiveTrackMarker points={points} activeDistance={activeDistance} />
      ) : null}
    </>
  );
}

function ActiveTrackMarker({ points, activeDistance }: { points: GpxPoint[]; activeDistance: number }) {
  const nearestPoint = useMemo(() => {
    let distanceSoFar = 0;
    let nearest: GpxPoint | null = null;
    let nearestDelta = Number.POSITIVE_INFINITY;

    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];

      if (index > 0) {
        distanceSoFar += haversineDistance(points[index - 1], current);
      }

      const delta = Math.abs(distanceSoFar - activeDistance);
      if (delta < nearestDelta) {
        nearestDelta = delta;
        nearest = current;
      }
    }

    return nearest;
  }, [activeDistance, points]);

  if (!nearestPoint) {
    return null;
  }

  return (
    <CircleMarker
      center={[nearestPoint.lat, nearestPoint.lon]}
      radius={10}
      pathOptions={{
        color: "#5fb4e7",
        fillColor: "#5fb4e7",
        fillOpacity: 0.18,
        weight: 2,
      }}
    >
      <Tooltip permanent direction="top" offset={[0, -8]}>
        {activeDistance.toFixed(1)} km
      </Tooltip>
    </CircleMarker>
  );
}

export function GpxViewer({ gpxContent, gpxFileName }: GpxViewerProps) {
  const model = useMemo(() => {
    if (!gpxContent) {
      return {
        error: "Encara no hi ha un GPX guardat.",
        points: [] as GpxPoint[],
        profilePathD: "",
        profileHasData: false,
        profileMaxElevation: 0,
        profileMinElevation: 0,
        profileMaxDistance: 0,
        profilePoints: [] as ProfileModel["points"],
      };
    }

    const extracted = extractPoints(gpxContent);
    if (extracted.error) {
      return {
        error: extracted.error,
        points: [] as GpxPoint[],
        profilePathD: "",
        profileHasData: false,
        profileMaxElevation: 0,
        profileMinElevation: 0,
        profileMaxDistance: 0,
        profilePoints: [] as ProfileModel["points"],
      };
    }

    const profile = buildProfile(extracted.points);

    return {
      error: null as string | null,
      points: extracted.points,
      profilePathD: profile.pathD,
      profileHasData: profile.hasData,
      profileMaxElevation: profile.maxElevation,
      profileMinElevation: profile.minElevation,
      profileMaxDistance: profile.maxDistance,
      profilePoints: profile.points,
    };
  }, [gpxContent]);

  const [activeDistance, setActiveDistance] = useState<number | null>(null);
  const [tileStyleId, setTileStyleId] = useState<string>("carto-voyager");
  const selectedTileStyle = useMemo(
    () => TILE_STYLE_OPTIONS.find((option) => option.id === tileStyleId) ?? TILE_STYLE_OPTIONS[0],
    [tileStyleId],
  );

  const activeProfilePoint = useMemo(() => {
    if (!model.profileHasData || activeDistance === null) {
      return null;
    }

    return (
      model.profilePoints.reduce<ProfileModel["points"][number] | null>(
        (closest, point) => {
          if (!closest) {
            return point;
          }

          const currentDelta = Math.abs(point.distance - activeDistance);
          const closestDelta = Math.abs(closest.distance - activeDistance);
          return currentDelta < closestDelta ? point : closest;
        },
        null,
      ) ?? null
    );
  }, [activeDistance, model.profileHasData, model.profilePoints]);

  const updateActiveDistanceFromProfile = (point: ProfileModel["points"][number] | null) => {
    if (!point) {
      setActiveDistance(null);
      return;
    }

    setActiveDistance(point.distance);
  };

  const downloadFileName = useMemo(() => {
    const trimmed = (gpxFileName ?? "").trim();
    if (!trimmed) {
      return "track.gpx";
    }

    return trimmed.toLowerCase().endsWith(".gpx") ? trimmed : `${trimmed}.gpx`;
  }, [gpxFileName]);

  const downloadUrl = useMemo(() => {
    if (!gpxContent) {
      return null;
    }

    const blob = new Blob([gpxContent], { type: "application/gpx+xml;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, [gpxContent]);

  useEffect(() => {
    if (!downloadUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  if (model.error) {
    return (
      <div className="gpx-viewer gpx-viewer--empty">
        <p className="route-detail__empty">{model.error}</p>
      </div>
    );
  }

  return (
    <div className="gpx-viewer">
      <div className="gpx-viewer__map-shell">
        <MapContainer
          center={[model.points[0].lat, model.points[0].lon]}
          zoom={12}
          scrollWheelZoom
          zoomControl={false}
          className="gpx-viewer__map"
        >
          <TileLayer
            key={selectedTileStyle.id}
            attribution={selectedTileStyle.attribution}
            url={selectedTileStyle.url}
            maxZoom={selectedTileStyle.maxZoom}
          />
          <GpxMapLayer
            points={model.points}
            activeDistance={activeDistance}
            onActiveDistanceChange={setActiveDistance}
          />
        </MapContainer>
      </div>

      <div className="gpx-viewer__legend">
        <span>
          <i className="gpx-viewer__dot gpx-viewer__dot--start" /> Inici
        </span>
        <span>
          <i className="gpx-viewer__dot gpx-viewer__dot--end" /> Final
        </span>
        <label className="gpx-viewer__tile-switch">
          <span>Mapa</span>
          <select value={tileStyleId} onChange={(event) => setTileStyleId(event.target.value)} className="gpx-viewer__tile-select">
            {TILE_STYLE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {downloadUrl ? (
          <a className="button button--secondary button--small" href={downloadUrl} download={downloadFileName}>
            Descarregar track
          </a>
        ) : null}
      </div>

      <div className="gpx-profile">
        {model.profileHasData ? (
          <div className="gpx-profile__chart-shell">
            <svg
              className="gpx-profile__svg"
              viewBox={`0 0 ${PROFILE_VIEWBOX_WIDTH} ${PROFILE_VIEWBOX_HEIGHT}`}
              role="img"
              aria-label="Perfil d'altimetria GPX"
              onPointerLeave={() => setActiveDistance(null)}
              onPointerMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width) * PROFILE_VIEWBOX_WIDTH;
                const closest = model.profilePoints.reduce<{ point: ProfileModel["points"][number] | null; distance: number }>(
                  (acc, point) => {
                    const delta = Math.abs(point.x - x);
                    if (delta < acc.distance) {
                      return { point, distance: delta };
                    }
                    return acc;
                  },
                  { point: null, distance: Number.POSITIVE_INFINITY },
                );

                updateActiveDistanceFromProfile(closest.point);
              }}
              onTouchMove={(event) => {
                const touch = event.touches[0];
                if (!touch) {
                  return;
                }

                const rect = event.currentTarget.getBoundingClientRect();
                const x = ((touch.clientX - rect.left) / rect.width) * PROFILE_VIEWBOX_WIDTH;
                const closest = model.profilePoints.reduce<{ point: ProfileModel["points"][number] | null; distance: number }>(
                  (acc, point) => {
                    const delta = Math.abs(point.x - x);
                    if (delta < acc.distance) {
                      return { point, distance: delta };
                    }
                    return acc;
                  },
                  { point: null, distance: Number.POSITIVE_INFINITY },
                );

                updateActiveDistanceFromProfile(closest.point);
              }}
            >
              <defs>
                <linearGradient id="profile-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#5fb4e7" />
                  <stop offset="100%" stopColor="#12355a" />
                </linearGradient>
                <pattern id="profile-grid" width="24" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 17 0 L 0 0 0 18" fill="none" stroke="rgba(21, 32, 43, 0.08)" strokeWidth="0.35" />
                </pattern>
              </defs>
              <rect x="0" y="0" width={PROFILE_VIEWBOX_WIDTH} height={PROFILE_VIEWBOX_HEIGHT} rx="8" fill="rgba(255,255,255,0.72)" />
              <rect
                x={PROFILE_PADDING_LEFT}
                y={PROFILE_PADDING_TOP}
                width={PROFILE_CHART_WIDTH}
                height={PROFILE_CHART_HEIGHT}
                fill="url(#profile-grid)"
                opacity="0.8"
              />
              {Array.from({ length: 5 }, (_, index) => {
                const x = PROFILE_PADDING_LEFT + (PROFILE_CHART_WIDTH / 4) * index;
                const labelValue = (model.profileMaxDistance * index) / 4;
                return (
                  <g key={`x-${index}`}>
                    <line
                      x1={x}
                      y1={PROFILE_PADDING_TOP}
                      x2={x}
                      y2={PROFILE_PADDING_BOTTOM}
                      stroke="rgba(21,32,43,0.08)"
                      strokeWidth="0.35"
                    />
                    <text x={x} y="47" textAnchor="middle" className="gpx-profile__label">
                      {labelValue.toFixed(1)} km
                    </text>
                  </g>
                );
              })}
              {Array.from({ length: 5 }, (_, index) => {
                const y = PROFILE_PADDING_BOTTOM - index * ((PROFILE_PADDING_BOTTOM - PROFILE_PADDING_TOP) / 4);
                const labelValue =
                  model.profileMinElevation +
                  ((model.profileMaxElevation - model.profileMinElevation) * index) / 4;
                return (
                  <g key={`y-${index}`}>
                    <line
                      x1={PROFILE_PADDING_LEFT}
                      y1={y}
                      x2={PROFILE_VIEWBOX_WIDTH - PROFILE_PADDING_RIGHT}
                      y2={y}
                      stroke="rgba(21,32,43,0.08)"
                      strokeWidth="0.35"
                    />
                    <text x="3.2" y={y + 1.5} textAnchor="end" className="gpx-profile__label">
                      {Math.round(labelValue)} m
                    </text>
                  </g>
                );
              })}
              <path
                d={`M ${PROFILE_PADDING_LEFT} ${PROFILE_PADDING_BOTTOM} L ${PROFILE_VIEWBOX_WIDTH - PROFILE_PADDING_RIGHT} ${PROFILE_PADDING_BOTTOM}`}
                stroke="rgba(21,32,43,0.26)"
                strokeWidth="0.7"
              />
              <path
                d={`M ${PROFILE_PADDING_LEFT} ${PROFILE_PADDING_BOTTOM} L ${PROFILE_PADDING_LEFT} ${PROFILE_PADDING_TOP}`}
                stroke="rgba(21,32,43,0.26)"
                strokeWidth="0.7"
              />
              <path d={model.profilePathD} fill="none" stroke="url(#profile-line-gradient)" strokeWidth="1.8" />
              {activeProfilePoint ? (
                <>
                  <line
                    x1={activeProfilePoint.x}
                    y1={PROFILE_PADDING_TOP}
                    x2={activeProfilePoint.x}
                    y2={PROFILE_PADDING_BOTTOM}
                    stroke="rgba(95, 180, 231, 0.55)"
                    strokeWidth="0.5"
                    strokeDasharray="1.5 1.5"
                  />
                  <circle
                    cx={activeProfilePoint.x}
                    cy={activeProfilePoint.y}
                    r="2.4"
                    fill="#5fb4e7"
                    stroke="#ffffff"
                    strokeWidth="0.7"
                  />
                </>
              ) : null}
              <text x={PROFILE_VIEWBOX_WIDTH - PROFILE_PADDING_RIGHT} y="48" textAnchor="end" className="gpx-profile__label">
                km
              </text>
              <text x={PROFILE_PADDING_LEFT} y="10" textAnchor="end" className="gpx-profile__label">
                m
              </text>
            </svg>
            {activeProfilePoint ? (
              <div
                className="gpx-profile__tooltip"
                style={{
                  left: `${Math.min(96, Math.max(12, (activeProfilePoint.x / PROFILE_VIEWBOX_WIDTH) * 100))}%`,
                  top: `${Math.max(8, ((activeProfilePoint.y - 14) / PROFILE_VIEWBOX_HEIGHT) * 100)}%`,
                }}
                aria-live="polite"
              >
                <strong>{activeProfilePoint.distance.toFixed(1)} km</strong>
                <span>{Math.round(activeProfilePoint.ele)} m</span>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="route-detail__empty">El GPX no inclou alçades suficients per a mostrar el perfil.</p>
        )}
      </div>
    </div>
  );
}
