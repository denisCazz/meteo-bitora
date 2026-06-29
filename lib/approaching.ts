/**
 * Sistema di rilevamento "qualcosa si sta muovendo verso di me".
 *
 * Idea: campioniamo la precipitazione prevista (mm ogni 15 min) non solo sulla
 * posizione dell'utente ma anche su una corona di 8 punti cardinali attorno a
 * lui (raggio ~18 km, dentro il campo visivo del radar). Analizzando come
 * evolve la precipitazione nei prossimi step temporali capiamo se una cella
 * piovosa sta entrando verso il centro e da quale direzione.
 */

import {
  destinationPoint,
  bearingToCardinal,
  type LatLng,
} from "./geo";
import type { PointPrecipitationSeries } from "./openMeteo";

/** Bearing dei punti della corona (0 = Nord, in senso orario). */
const RING_BEARINGS = [0, 45, 90, 135, 180, 225, 270, 315];

/** Raggio della corona di campionamento (km). */
const RING_RADIUS_KM = 18;

/** Soglia oltre la quale consideriamo "pioggia" un singolo step (mm/15min). */
const WET_THRESHOLD = 0.05;

/** Numero di step (15 min) analizzati in avanti: 8 = 2 ore. */
const WINDOW_STEPS = 8;

export type ApproachStatus = "clear" | "nearby" | "approaching" | "raining";

export interface ApproachAnalysis {
  status: ApproachStatus;
  /** Direzione di provenienza (es. "Nord-Ovest"), se applicabile */
  fromCardinal?: string;
  fromBearing?: number;
  /** Minuti stimati prima che la pioggia raggiunga l'utente */
  etaMinutes?: number;
  /** Intensità stimata al picco */
  intensity?: "debole" | "moderata" | "forte";
  peakMm?: number;
  /** Messaggio pronto da mostrare in UI */
  message: string;
}

/**
 * Costruisce i punti da interrogare: il centro (utente) seguito dagli 8 punti
 * della corona. L'ordine è importante: deve combaciare con l'ordine delle
 * serie restituite da Open-Meteo.
 */
export function buildSamplePoints(center: LatLng): LatLng[] {
  const ring = RING_BEARINGS.map((b) =>
    destinationPoint(center, b, RING_RADIUS_KM),
  );
  return [center, ...ring];
}

/** Classifica l'intensità a partire dalla precipitazione di picco (mm/15min). */
function classifyIntensity(peakMm: number): "debole" | "moderata" | "forte" {
  // Convertiamo in mm/h (x4) e usiamo le soglie meteorologiche standard.
  const mmPerHour = peakMm * 4;
  if (mmPerHour >= 7.6) return "forte";
  if (mmPerHour >= 2.5) return "moderata";
  return "debole";
}

/**
 * Media circolare dei bearing pesata per la precipitazione di ciascun punto
 * della corona: indica la direzione media da cui proviene la pioggia.
 */
function weightedIncomingBearing(ringWeights: number[]): number | undefined {
  let x = 0;
  let y = 0;
  let total = 0;
  for (let i = 0; i < RING_BEARINGS.length; i++) {
    const w = ringWeights[i] ?? 0;
    if (w <= 0) continue;
    const rad = (RING_BEARINGS[i] * Math.PI) / 180;
    x += Math.cos(rad) * w;
    y += Math.sin(rad) * w;
    total += w;
  }
  if (total === 0) return undefined;
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Analizza le serie di precipitazione (centro + corona) e produce il verdetto.
 * `series[0]` è il centro, `series[1..8]` sono i punti della corona.
 */
export function analyzeApproach(
  series: PointPrecipitationSeries[],
): ApproachAnalysis {
  if (series.length < 1) {
    return { status: "clear", message: "Dati radar non disponibili." };
  }

  const center = series[0].precipitation;
  const ring = series.slice(1).map((s) => s.precipitation);

  const steps = Math.min(
    WINDOW_STEPS,
    center.length,
    ...ring.map((r) => r.length),
  );

  // Picco di precipitazione previsto sul centro entro la finestra.
  let peakCenter = 0;
  for (let i = 0; i < steps; i++) {
    if (center[i] > peakCenter) peakCenter = center[i];
  }

  const nowCenter = center[0] ?? 0;

  // Peso direzionale: somma della precipitazione sulla corona nei primi step
  // (è lì che si trova la cella prima di arrivare al centro).
  const earlySteps = Math.min(4, steps); // prima ora
  const ringWeights = ring.map((r) => {
    let sum = 0;
    for (let i = 0; i < earlySteps; i++) sum += r[i] ?? 0;
    return sum;
  });
  const incomingBearing = weightedIncomingBearing(ringWeights);

  // CASO 1 — sta già piovendo sull'utente.
  if (nowCenter >= WET_THRESHOLD) {
    // Capiamo se peggiora o si sta esaurendo guardando il trend.
    const later = center[Math.min(steps - 1, 3)] ?? 0;
    const trend = later > nowCenter ? "in intensificazione" : "in attenuazione";
    const intensity = classifyIntensity(Math.max(peakCenter, nowCenter));
    return {
      status: "raining",
      intensity,
      peakMm: Math.max(peakCenter, nowCenter),
      message: `Sta piovendo (${intensity}, ${trend}).`,
    };
  }

  // Cerchiamo il primo step futuro in cui la pioggia raggiunge il centro.
  let arrivalStep = -1;
  for (let i = 1; i < steps; i++) {
    if ((center[i] ?? 0) >= WET_THRESHOLD * 2) {
      arrivalStep = i;
      break;
    }
  }

  // CASO 2 — la pioggia arriverà sull'utente: avvicinamento.
  if (arrivalStep > 0) {
    const intensity = classifyIntensity(peakCenter);
    const etaMinutes = arrivalStep * 15;
    const fromCardinal =
      incomingBearing !== undefined
        ? bearingToCardinal(incomingBearing)
        : undefined;

    const dirText = fromCardinal ? ` da ${fromCardinal}` : "";
    return {
      status: "approaching",
      fromBearing: incomingBearing,
      fromCardinal,
      etaMinutes,
      intensity,
      peakMm: peakCenter,
      message: `Pioggia ${intensity} in avvicinamento${dirText}, arrivo stimato tra ~${etaMinutes} min.`,
    };
  }

  // CASO 3 — c'è pioggia nelle vicinanze ma non sta puntando verso l'utente.
  const ringHasRain = ringWeights.some((w) => w >= WET_THRESHOLD);
  if (ringHasRain) {
    const fromCardinal =
      incomingBearing !== undefined
        ? bearingToCardinal(incomingBearing)
        : undefined;
    const dirText = fromCardinal ? ` a ${fromCardinal}` : " nelle vicinanze";
    return {
      status: "nearby",
      fromBearing: incomingBearing,
      fromCardinal,
      message: `Pioggia presente${dirText}, al momento non in avvicinamento.`,
    };
  }

  // CASO 4 — tutto sereno nel raggio analizzato.
  return {
    status: "clear",
    message: "Nessuna pioggia in avvicinamento nelle prossime 2 ore.",
  };
}
