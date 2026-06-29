/**
 * Client per le API gratuite di Open-Meteo (nessuna API key richiesta).
 *
 * Espone due funzioni principali:
 *  - fetchForecast: meteo attuale + previsione oraria della probabilità di pioggia
 *    per il punto dell'utente.
 *  - fetchMultiPointPrecipitation: precipitazione (mm) ogni 15 minuti su più punti,
 *    usata dall'algoritmo che rileva se la pioggia si sta avvicinando.
 */

import type { LatLng } from "./geo";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

/** Dato meteo "attuale" estratto dalla risposta Open-Meteo. */
export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  isDay: boolean;
  windSpeed: number;
  humidity: number;
  /** Probabilità di pioggia attuale in % (presa dall'ora corrente) */
  precipitationProbability: number;
}

/** Singola voce della previsione oraria della probabilità di pioggia. */
export interface HourlyPrecip {
  time: string;
  precipitationProbability: number;
}

export interface ForecastResult {
  current: CurrentWeather;
  /** Probabilità di pioggia per le prossime 6 ore */
  nextHours: HourlyPrecip[];
}

interface OpenMeteoForecastResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    is_day: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  hourly: {
    time: string[];
    precipitation_probability: number[];
  };
}

/**
 * Recupera il meteo attuale e la previsione oraria della probabilità di pioggia.
 * La "probabilità attuale" viene presa dall'ora corrente nell'array orario.
 */
export async function fetchForecast(coords: LatLng): Promise<ForecastResult> {
  const params = new URLSearchParams({
    latitude: coords.lat.toString(),
    longitude: coords.lon.toString(),
    current:
      "temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m",
    hourly: "precipitation_probability",
    timezone: "auto",
    forecast_days: "2",
  });

  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Open-Meteo ha risposto con stato ${res.status}`);
  }

  const data = (await res.json()) as OpenMeteoForecastResponse;

  // Troviamo l'indice dell'ora corrente per leggere la probabilità "attuale".
  const nowIso = data.current.time.slice(0, 13); // YYYY-MM-DDTHH
  let currentIndex = data.hourly.time.findIndex((t) => t.startsWith(nowIso));
  if (currentIndex === -1) currentIndex = 0;

  const current: CurrentWeather = {
    temperature: Math.round(data.current.temperature_2m),
    apparentTemperature: Math.round(data.current.apparent_temperature),
    weatherCode: data.current.weather_code,
    isDay: data.current.is_day === 1,
    windSpeed: Math.round(data.current.wind_speed_10m),
    humidity: Math.round(data.current.relative_humidity_2m),
    precipitationProbability:
      data.hourly.precipitation_probability[currentIndex] ?? 0,
  };

  // Le prossime 6 ore (escludendo l'ora corrente).
  const nextHours: HourlyPrecip[] = [];
  for (let i = currentIndex + 1; i <= currentIndex + 6; i++) {
    if (data.hourly.time[i] === undefined) break;
    nextHours.push({
      time: data.hourly.time[i],
      precipitationProbability: data.hourly.precipitation_probability[i] ?? 0,
    });
  }

  return { current, nextHours };
}

/** Serie temporale di precipitazione (mm) per un singolo punto. */
export interface PointPrecipitationSeries {
  coords: LatLng;
  times: string[];
  /** Precipitazione in mm per ogni step di 15 minuti */
  precipitation: number[];
}

interface OpenMeteoMinutelyResponse {
  latitude: number;
  longitude: number;
  minutely_15: {
    time: string[];
    precipitation: number[];
  };
}

/**
 * Recupera la precipitazione (mm) ogni 15 minuti per più punti in una sola
 * richiesta. Open-Meteo accetta coordinate multiple separate da virgola e
 * restituisce un array di risultati nello stesso ordine.
 */
export async function fetchMultiPointPrecipitation(
  points: LatLng[],
): Promise<PointPrecipitationSeries[]> {
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat.toFixed(4)).join(","),
    longitude: points.map((p) => p.lon.toFixed(4)).join(","),
    minutely_15: "precipitation",
    timezone: "auto",
    // Niente passato: la serie parte dallo step di 15 minuti corrente (indice 0 = adesso)
    past_minutely_15: "0",
    // 12 step da 15 minuti = 3 ore di previsione a breve termine
    forecast_minutely_15: "12",
  });

  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Open-Meteo (multi-punto) ha risposto con stato ${res.status}`);
  }

  const json = await res.json();
  // Con coordinate multiple Open-Meteo restituisce un array; con un solo
  // punto un oggetto singolo. Normalizziamo sempre ad array.
  const list: OpenMeteoMinutelyResponse[] = Array.isArray(json) ? json : [json];

  return list.map((item, i) => ({
    coords: points[i] ?? { lat: item.latitude, lon: item.longitude },
    times: item.minutely_15?.time ?? [],
    precipitation: item.minutely_15?.precipitation ?? [],
  }));
}
