/**
 * Client per l'API pubblica di RainViewer.
 * Restituisce l'elenco dei frame radar disponibili (passato + nowcast) con i
 * relativi URL dei tile, da sovrapporre alla mappa Leaflet.
 *
 * Endpoint: https://api.rainviewer.com/public/weather-maps.json
 */

const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json";

/** Singolo frame radar con timestamp e URL template dei tile. */
export interface RadarFrame {
  /** Timestamp UNIX (in secondi) del frame */
  time: number;
  /** Indica se il frame è una previsione (nowcast) o dato osservato */
  isForecast: boolean;
  /** URL template dei tile, pronto per Leaflet ({z}/{x}/{y}) */
  tileUrl: string;
}

interface RainViewerFrame {
  time: number;
  path: string;
}

interface RainViewerResponse {
  version: string;
  host: string;
  radar: {
    past: RainViewerFrame[];
    nowcast: RainViewerFrame[];
  };
}

/**
 * Opzioni dei tile RainViewer:
 *  - size: 256 o 512 px
 *  - color: schema colori (2 = "Universal Blue")
 *  - smooth: 1 per smussare i bordi
 *  - snow: 1 per distinguere la neve
 */
const TILE_SIZE = 256;
const COLOR_SCHEME = 2;
const SMOOTH = 1;
const SNOW = 1;

/**
 * Recupera i frame radar disponibili. Unisce i frame "past" (osservati) con i
 * frame "nowcast" (previsione a breve), ordinati cronologicamente.
 */
export async function fetchRadarFrames(): Promise<RadarFrame[]> {
  const res = await fetch(RAINVIEWER_API, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`RainViewer ha risposto con stato ${res.status}`);
  }

  const data = (await res.json()) as RainViewerResponse;
  const host = data.host;

  const build = (frame: RainViewerFrame, isForecast: boolean): RadarFrame => ({
    time: frame.time,
    isForecast,
    tileUrl: `${host}${frame.path}/${TILE_SIZE}/{z}/{x}/{y}/${COLOR_SCHEME}/${SMOOTH}_${SNOW}.png`,
  });

  const past = (data.radar?.past ?? []).map((f) => build(f, false));
  const nowcast = (data.radar?.nowcast ?? []).map((f) => build(f, true));

  return [...past, ...nowcast];
}
