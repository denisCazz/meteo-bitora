"use client";

/**
 * Client Component principale.
 * Orchestra l'intera esperienza interattiva:
 *  1. richiede la geolocalizzazione (fallback su Roma se negata/non disponibile)
 *  2. scarica meteo attuale + previsione oraria (Open-Meteo)
 *  3. scarica i frame radar (RainViewer)
 *  4. analizza l'avvicinamento della pioggia (campionamento multi-punto)
 *  5. compone il layout con il FOCUS sul radar
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { LocateFixed, MapPin, RefreshCw, Loader2 } from "lucide-react";

import { ROME, type LatLng } from "@/lib/geo";
import {
  fetchForecast,
  fetchMultiPointPrecipitation,
  type ForecastResult,
} from "@/lib/openMeteo";
import { fetchRadarFrames, type RadarFrame } from "@/lib/rainviewer";
import {
  analyzeApproach,
  buildSamplePoints,
  type ApproachAnalysis,
} from "@/lib/approaching";

import CurrentWeatherCard from "@/components/CurrentWeatherCard";
import HourlyPrecip from "@/components/HourlyPrecip";
import ApproachingAlert from "@/components/ApproachingAlert";

// La mappa usa Leaflet (API del browser): la importiamo lato client senza SSR.
const RadarMap = dynamic(() => import("@/components/RadarMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ),
});

type LocationSource = "gps" | "fallback";

export default function WeatherDashboard() {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [source, setSource] = useState<LocationSource>("fallback");

  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [frames, setFrames] = useState<RadarFrame[]>([]);
  const [approach, setApproach] = useState<ApproachAnalysis | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Richiede la posizione tramite Geolocation API, con fallback su Roma. */
  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setCoords(ROME);
      setSource("fallback");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setSource("gps");
      },
      () => {
        // Permesso negato o errore: ripieghiamo su Roma.
        setCoords(ROME);
        setSource("fallback");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  // All'avvio richiediamo subito la posizione.
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  /** Scarica tutti i dati per le coordinate correnti. */
  const loadData = useCallback(async (location: LatLng) => {
    setLoading(true);
    setError(null);
    try {
      const points = buildSamplePoints(location);
      const [forecastData, radarFrames, multiPoint] = await Promise.all([
        fetchForecast(location),
        fetchRadarFrames(),
        fetchMultiPointPrecipitation(points),
      ]);

      setForecast(forecastData);
      setFrames(radarFrames);
      setApproach(analyzeApproach(multiPoint));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossibile recuperare i dati meteo.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Ogni volta che cambiano le coordinate, ricarichiamo i dati.
  useEffect(() => {
    if (!coords) return;
    loadData(coords);

    // Aggiornamento automatico ogni 5 minuti (radar e avvicinamento).
    const id = setInterval(() => loadData(coords), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [coords, loadData]);

  const locationLabel = useMemo(() => {
    if (!coords) return "—";
    if (source === "fallback") return "Roma (predefinita)";
    return `${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}`;
  }, [coords, source]);

  return (
    <div className="flex flex-col gap-6">
      {/* Barra di stato: posizione + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          {source === "gps" ? (
            <LocateFixed className="h-4 w-4 text-radar-ok" />
          ) : (
            <MapPin className="h-4 w-4 text-radar-warn" />
          )}
          <span>{locationLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={requestLocation}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            Usa la mia posizione
          </button>
          <button
            onClick={() => coords && loadData(coords)}
            disabled={loading || !coords}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Aggiorna
          </button>
        </div>
      </div>

      {error && (
        <div className="glass border-radar-danger/30 bg-radar-danger/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Avviso "qualcosa si avvicina" — sempre in evidenza */}
      <ApproachingAlert analysis={approach} loading={loading} />

      {/* Layout principale: FOCUS sul radar (grande), info a lato */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* RADAR — occupa 2/3 su desktop, è il protagonista */}
        <section className="glass relative h-[60vh] min-h-[420px] overflow-hidden p-0 lg:col-span-2 lg:h-[72vh]">
          {coords && <RadarMap center={coords} frames={frames} approach={approach} />}
        </section>

        {/* Colonna informativa */}
        <aside className="flex flex-col gap-6">
          <CurrentWeatherCard current={forecast?.current ?? null} loading={loading} />
          <HourlyPrecip hours={forecast?.nextHours ?? []} loading={loading} />
        </aside>
      </div>
    </div>
  );
}
