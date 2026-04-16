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

type ClimbSegment = {
  startDistance: number;
  endDistance: number;
  startEle: number;
  endEle: number;
  gain: number;
  length: number;
  avgGradient: number;
  maxGradient: number;
  points: TrackPoint[];
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

// --- Climb detection ---

const GRADIENT_ZONES: { max: number; color: string; label: string }[] = [
  { max: 3,        color: "#94a3b8", label: "< 3%" },
  { max: 6,        color: "#4ade80", label: "3–6%" },
  { max: 9,        color: "#facc15", label: "6–9%" },
  { max: 12,       color: "#fb923c", label: "9–12%" },
  { max: 16,       color: "#ef4444", label: "12–16%" },
  { max: Infinity, color: "#9f1239", label: "> 16%" },
];

function gradientColor(pct: number): string {
  if (pct < 0) return "#94a3b8";
  for (const zone of GRADIENT_ZONES) {
    if (pct <= zone.max) return zone.color;
  }
  return GRADIENT_ZONES[GRADIENT_ZONES.length - 1].color;
}

function smoothEleArr(points: TrackPoint[], half: number): number[] {
  return points.map((_, i) => {
    const from = Math.max(0, i - half);
    const to = Math.min(points.length - 1, i + half);
    let sum = 0;
    for (let j = from; j <= to; j++) sum += points[j].ele;
    return sum / (to - from + 1);
  });
}

function detectClimbs(trackPoints: TrackPoint[]): ClimbSegment[] {
  if (trackPoints.length < 10) return [];

  const MIN_GAIN = 60;
  const MIN_LENGTH = 0.8;
  const MAX_BREAK = 25;
  const ele = smoothEleArr(trackPoints, 6);
  const climbs: ClimbSegment[] = [];
  let valleyIdx = 0;
  let peakIdx = 0;
  let peakEle = ele[0];

  const emit = (vIdx: number, pIdx: number) => {
    const pts = trackPoints.slice(vIdx, pIdx + 1);
    if (pts.length < 2) return;
    const gain = ele[pIdx] - ele[vIdx];
    const length = pts[pts.length - 1].distance - pts[0].distance;
    if (gain < MIN_GAIN || length < MIN_LENGTH) return;
    const smoothed = smoothEleArr(pts, 4);
    let maxGrad = 0;
    for (let k = 1; k < pts.length; k++) {
      const d = (pts[k].distance - pts[k - 1].distance) * 1000;
      const g = smoothed[k] - smoothed[k - 1];
      if (d > 2) maxGrad = Math.max(maxGrad, (g / d) * 100);
    }
    climbs.push({
      startDistance: pts[0].distance,
      endDistance: pts[pts.length - 1].distance,
      startEle: pts[0].ele,
      endEle: pts[pts.length - 1].ele,
      gain: Math.round(gain),
      length,
      avgGradient: (gain / (length * 1000)) * 100,
      maxGradient: maxGrad,
      points: pts,
    });
  };

  for (let i = 1; i < ele.length; i++) {
    if (ele[i] > peakEle) {
      peakEle = ele[i];
      peakIdx = i;
    }
    const drop = peakEle - ele[i];
    if (i === ele.length - 1) {
      emit(valleyIdx, peakIdx);
      break;
    }
    if (drop >= MAX_BREAK) {
      emit(valleyIdx, peakIdx);
      valleyIdx = i;
      peakIdx = i;
      peakEle = ele[i];
    } else if (ele[i] < ele[valleyIdx] && peakIdx === valleyIdx) {
      valleyIdx = i;
      peakIdx = i;
      peakEle = ele[i];
    }
  }

  return climbs;
}

// --- Climb mini-profile SVG ---

const MINI_W = 100;
const MINI_H = 60;
const MINI_PAD_LEFT = 10;
const MINI_PAD_RIGHT = 2;
const MINI_PAD_TOP = 4;
const MINI_PAD_BTM = 11;
const MINI_CHART_W = MINI_W - MINI_PAD_LEFT - MINI_PAD_RIGHT;
const MINI_CHART_BOTTOM = MINI_H - MINI_PAD_BTM;
const MINI_CHART_H = MINI_CHART_BOTTOM - MINI_PAD_TOP;

function ClimbMiniProfile({ points }: { points: TrackPoint[] }) {
  const data = useMemo(() => {
    if (points.length < 2) return null;

    const startDist = points[0].distance;
    const endDist = points[points.length - 1].distance;
    const totalLength = endDist - startDist;
    const eles = points.map((p) => p.ele);
    const minEle = Math.min(...eles);
    const maxEle = Math.max(...eles);
    const distSpan = Math.max(totalLength, 0.001);
    const eleSpan = Math.max(maxEle - minEle, 1);

    const toX = (d: number) => MINI_PAD_LEFT + ((d - startDist) / distSpan) * MINI_CHART_W;
    const toY = (e: number) => MINI_PAD_TOP + (1 - (e - minEle) / eleSpan) * MINI_CHART_H;

    // Interpolate elevation at any distance using the raw track points
    const eleAt = (dist: number): number => {
      if (dist <= points[0].distance) return points[0].ele;
      if (dist >= points[points.length - 1].distance) return points[points.length - 1].ele;
      for (let i = 1; i < points.length; i++) {
        if (points[i].distance >= dist) {
          const span = points[i].distance - points[i - 1].distance;
          if (span < 0.000001) return points[i].ele;
          const t = (dist - points[i - 1].distance) / span;
          return points[i - 1].ele + t * (points[i].ele - points[i - 1].ele);
        }
      }
      return points[points.length - 1].ele;
    };

    // ~200 m windows (Garmin-like): ~25 windows per climb, clamped [0.08, 0.25] km
    const windowKm = Math.max(0.08, Math.min(0.25, totalLength / 25));
    const numWindows = Math.round(totalLength / windowKm);
    const actualWindow = totalLength / Math.max(numWindows, 1);

    // Gradient per window
    const raw: { start: number; end: number; grad: number; color: string }[] = [];
    for (let w = 0; w < numWindows; w++) {
      const wStart = startDist + w * actualWindow;
      const wEnd = startDist + (w + 1) * actualWindow;
      const grad = ((eleAt(wEnd) - eleAt(wStart)) / (actualWindow * 1000)) * 100;
      raw.push({ start: wStart, end: wEnd, grad, color: gradientColor(grad) });
    }

    // Merge only when: same color zone AND gradient difference < 1% AND zone < 0.8 km
    const MERGE_THRESHOLD = 1.0;
    const MAX_ZONE_KM = 0.8;
    const merged: { start: number; end: number; grad: number; color: string }[] = [];
    for (const z of raw) {
      if (merged.length > 0) {
        const prev = merged[merged.length - 1];
        const zoneLen = prev.end - prev.start;
        if (
          prev.color === z.color &&
          Math.abs(prev.grad - z.grad) <= MERGE_THRESHOLD &&
          zoneLen < MAX_ZONE_KM
        ) {
          prev.end = z.end;
          prev.grad = ((eleAt(prev.end) - eleAt(prev.start)) / ((prev.end - prev.start) * 1000)) * 100;
          prev.color = gradientColor(prev.grad);
          continue;
        }
      }
      merged.push({ ...z });
    }

    // Build SVG data for each merged color zone
    type ZoneData = { fillPath: string; color: string; grad: number; labelX: number; labelY: number; wide: boolean };
    const zones: ZoneData[] = merged.map((zone) => {
      const zonePts = points.filter(
        (p) => p.distance > zone.start && p.distance < zone.end,
      );
      const allPts = [
        { distance: zone.start, ele: eleAt(zone.start) },
        ...zonePts,
        { distance: zone.end, ele: eleAt(zone.end) },
      ];
      const topPath = allPts
        .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.distance).toFixed(2)} ${toY(p.ele).toFixed(2)}`)
        .join(" ");
      const sx = toX(zone.start).toFixed(2);
      const ex = toX(zone.end).toFixed(2);
      const fillPath = `${topPath} L ${ex} ${MINI_CHART_BOTTOM} L ${sx} ${MINI_CHART_BOTTOM} Z`;

      const midDist = (zone.start + zone.end) / 2;
      const labelX = toX(midDist);
      const labelY = MINI_CHART_BOTTOM - 3;
      const zoneWidth = toX(zone.end) - toX(zone.start);

      return { fillPath, color: zone.color, grad: zone.grad, labelX, labelY, wide: zoneWidth > 12 };
    });

    // Thin white divider at merged zone boundaries, max 20 dividers total
    const MAX_DIVIDERS = 20;
    const minDividerGap = MINI_CHART_W / MAX_DIVIDERS;
    const dividers: { x: number; y: number }[] = [];
    let lastDivX = MINI_PAD_LEFT - minDividerGap;
    for (const z of merged.slice(1)) {
      const x = toX(z.start);
      if (x - lastDivX >= minDividerGap) {
        dividers.push({ x, y: toY(eleAt(z.start)) });
        lastDivX = x;
      }
    }

    // Y axis: max, mid, min elevation labels
    const midEle = (minEle + maxEle) / 2;
    const yAxisTicks = [
      { y: toY(maxEle), label: `${Math.round(maxEle)}` },
      { y: toY(midEle), label: `${Math.round(midEle)}` },
      { y: toY(minEle), label: `${Math.round(minEle)}` },
    ];

    // X axis: 0, mid, end of climb (relative distance within climb)
    const xAxisTicks = [
      { x: toX(startDist), label: "0", anchor: "start" as const },
      { x: toX((startDist + endDist) / 2), label: (totalLength / 2).toFixed(1), anchor: "middle" as const },
      { x: toX(endDist), label: `${totalLength.toFixed(1)} km`, anchor: "end" as const },
    ];

    return { zones, dividers, yAxisTicks, xAxisTicks };
  }, [points]);

  if (!data) return null;

  return (
    <svg viewBox={`0 0 ${MINI_W} ${MINI_H}`} className="climb-card__profile-svg" aria-hidden="true">
      {/* Chart background */}
      <rect
        x={MINI_PAD_LEFT}
        y={MINI_PAD_TOP}
        width={MINI_CHART_W}
        height={MINI_CHART_H}
        fill="rgba(240,248,255,0.5)"
      />
      {/* Filled gradient zones */}
      {data.zones.map((zone, i) => (
        <path key={i} d={zone.fillPath} fill={zone.color} opacity="0.9" />
      ))}
      {/* Thin white dividers at merged zone boundaries, inside the filled area only */}
      {data.dividers.map((d, i) => (
        <line
          key={`div-${i}`}
          x1={d.x.toFixed(2)}
          y1={d.y.toFixed(2)}
          x2={d.x.toFixed(2)}
          y2={MINI_CHART_BOTTOM}
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="0.2"
        />
      ))}
      {/* Gradient % labels inside wide zones */}
      {data.zones.map((zone, i) =>
        zone.wide && zone.grad > 0.5 ? (
          <text
            key={`lbl-${i}`}
            x={zone.labelX.toFixed(2)}
            y={zone.labelY.toFixed(2)}
            textAnchor="middle"
            className="climb-zone__label"
          >
            {zone.grad.toFixed(1)}%
          </text>
        ) : null,
      )}
      {/* Chart border */}
      <line
        x1={MINI_PAD_LEFT}
        y1={MINI_CHART_BOTTOM}
        x2={MINI_W - MINI_PAD_RIGHT}
        y2={MINI_CHART_BOTTOM}
        stroke="rgba(21,32,43,0.28)"
        strokeWidth="0.5"
      />
      <line
        x1={MINI_PAD_LEFT}
        y1={MINI_PAD_TOP}
        x2={MINI_PAD_LEFT}
        y2={MINI_CHART_BOTTOM}
        stroke="rgba(21,32,43,0.28)"
        strokeWidth="0.5"
      />
      {/* Y axis elevation labels */}
      {data.yAxisTicks.map((tick, i) => (
        <text
          key={`y-${i}`}
          x={(MINI_PAD_LEFT - 1).toFixed(1)}
          y={tick.y.toFixed(2)}
          textAnchor="end"
          dominantBaseline="middle"
          className="climb-axis__label"
        >
          {tick.label}
        </text>
      ))}
      {/* X axis distance labels */}
      {data.xAxisTicks.map((tick, i) => (
        <text
          key={`x-${i}`}
          x={tick.x.toFixed(2)}
          y={(MINI_H - 1.5).toFixed(1)}
          textAnchor={tick.anchor}
          className="climb-axis__label"
        >
          {tick.label}
        </text>
      ))}
    </svg>
  );
}

function ClimbCard({
  climb,
  index,
  total,
  isSelected,
  onClick,
}: {
  climb: ClimbSegment;
  index: number;
  total: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`climb-card${isSelected ? " climb-card--selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div className="climb-card__header">
        <span className="eyebrow">Ascens {index} de {total}</span>
      </div>
      <ClimbMiniProfile points={climb.points} />
      <div className="climb-card__legend">
        {GRADIENT_ZONES.map((zone) => (
          <span key={zone.label}>
            <i className="climb-legend__dot" style={{ background: zone.color }} />
            {zone.label}
          </span>
        ))}
      </div>
      <div className="climb-card__stats">
        <div className="climb-card__stat">
          <span>Distància</span>
          <strong>{climb.length.toFixed(1)} km</strong>
        </div>
        <div className="climb-card__stat">
          <span>Desnivell</span>
          <strong>+{climb.gain} m</strong>
        </div>
        <div className="climb-card__stat">
          <span>Pendent mitja</span>
          <strong>{climb.avgGradient.toFixed(1)}%</strong>
        </div>
      </div>
      <div className="climb-card__km-range">
        km {climb.startDistance.toFixed(1)} → {climb.endDistance.toFixed(1)}
      </div>
    </div>
  );
}

function ClimbsSection({
  climbs,
  selectedIdx,
  onSelect,
}: {
  climbs: ClimbSegment[];
  selectedIdx: number | null;
  onSelect: (idx: number | null) => void;
}) {
  if (climbs.length === 0) return null;
  return (
    <div className="climb-section">
      <div className="climb-section__header">
        <span className="eyebrow">Ascensos</span>
        <p className="climb-section__subtitle">
          {climbs.length} ascens{climbs.length !== 1 ? "os" : ""} detectat{climbs.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="climb-grid">
        {climbs.map((climb, i) => (
          <ClimbCard
            key={i}
            climb={climb}
            index={i + 1}
            total={climbs.length}
            isSelected={selectedIdx === i}
            onClick={() => onSelect(selectedIdx === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
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
        profileTrackPoints: [] as TrackPoint[],
        climbs: [] as ClimbSegment[],
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
        profileTrackPoints: [] as TrackPoint[],
        climbs: [] as ClimbSegment[],
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
      profileTrackPoints: profile.trackPoints,
      climbs: detectClimbs(profile.trackPoints),
    };
  }, [gpxContent]);

  const [activeDistance, setActiveDistance] = useState<number | null>(null);
  const [tileStyleId, setTileStyleId] = useState<string>("carto-voyager");
  const [selectedClimbIdx, setSelectedClimbIdx] = useState<number | null>(null);
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

  const profileHighlight = useMemo(() => {
    if (selectedClimbIdx === null) return null;
    const climb = model.climbs[selectedClimbIdx];
    if (!climb) return null;
    const pts = model.profilePoints.filter(
      (p) => p.distance >= climb.startDistance - 0.01 && p.distance <= climb.endDistance + 0.01,
    );
    if (pts.length < 2) return null;
    const linePath = pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ");
    const firstX = pts[0].x.toFixed(2);
    const lastX = pts[pts.length - 1].x.toFixed(2);
    const fillPath = `${linePath} L ${lastX} ${PROFILE_PADDING_BOTTOM} L ${firstX} ${PROFILE_PADDING_BOTTOM} Z`;
    return { linePath, fillPath };
  }, [selectedClimbIdx, model]);

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
              {profileHighlight ? (
                <>
                  <path d={profileHighlight.fillPath} fill="rgba(250,204,21,0.2)" stroke="none" />
                  <path
                    d={profileHighlight.linePath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </>
              ) : null}
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
      {model.profileHasData && model.climbs.length > 0 ? (
        <ClimbsSection
          climbs={model.climbs}
          selectedIdx={selectedClimbIdx}
          onSelect={setSelectedClimbIdx}
        />
      ) : null}
    </div>
  );
}
