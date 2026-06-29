"use client";

/**
 * Mappa radar interattiva (Client Component, niente SSR).
 *
 * Usa Leaflet "nativo" (non react-leaflet) per evitare problemi di rendering
 * lato server: l'intera libreria tocca `window`/`document`, quindi viene
 * istanziata solo nel browser tramite useEffect.
 *
 * Funzioni:
 *  - mappa scura centrata sull'utente con zoom 10 (~30 km di raggio visivo)
 *  - overlay dei tile radar RainViewer, animabili (play/pausa + timeline)
 *  - marker dell'utente e cerchio dei 30 km
 *  - quando la pioggia è in avvicinamento, una freccia mostra la direzione di
 *    provenienza direttamente sulla mappa
 */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Play, Pause } from "lucide-react";

import { destinationPoint, type LatLng } from "@/lib/geo";
import type { RadarFrame } from "@/lib/rainviewer";
import type { ApproachAnalysis } from "@/lib/approaching";

interface Props {
  center: LatLng;
  frames: RadarFrame[];
  approach: ApproachAnalysis | null;
}

const ZOOM = 10; // livello che mostra ~30 km di raggio
const RADIUS_KM = 30;

/** Formatta un timestamp UNIX (secondi) in "HH:MM". */
function formatTime(unix: number): string {
  const d = new Date(unix * 1000);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export default function RadarMap({ center, frames, approach }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  // Un layer di tile per ogni frame radar: animiamo cambiando opacità invece
  // di ricaricare gli URL, così la mappa non "lampeggia".
  const frameLayersRef = useRef<Map<number, L.TileLayer>>(new Map());
  // Evita di reimpostare la vista (e quindi lo zoom dell'utente) quando
  // cambiano solo i dati: ricentriamo solo quando cambiano le coordinate.
  const lastCenterRef = useRef<string>("");

  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  // 1) Inizializzazione della mappa (una sola volta).
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lon],
      zoom: ZOOM,
      minZoom: 4,
      // Oltre lo zoom 13 il radar (nativo z7) diventa troppo sgranato:
      // limitiamo lo zoom massimo mantenendo comunque ampio margine.
      maxZoom: 13,
      zoomControl: true,
      attributionControl: true,
    });
    lastCenterRef.current = `${center.lat},${center.lon}`;

    // Mappa di base scura (CartoDB dark matter).
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18,
      },
    ).addTo(map);

    // Gruppo per gli overlay (marker, cerchio, freccia direzionale).
    overlayRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
      frameLayersRef.current = new Map();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Ricentra la mappa SOLO quando cambiano davvero le coordinate, così non
  //    azzeriamo lo zoom scelto dall'utente ad ogni aggiornamento dati.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const key = `${center.lat},${center.lon}`;
    if (key === lastCenterRef.current) return;
    lastCenterRef.current = key;
    map.setView([center.lat, center.lon], ZOOM);
  }, [center]);

  // 3) Aggiorna gli overlay (marker, cerchio, freccia) senza toccare la vista.
  useEffect(() => {
    const map = mapRef.current;
    const overlay = overlayRef.current;
    if (!map || !overlay) return;

    overlay.clearLayers();

    // Marker dell'utente (divIcon pulsante per evitare immagini esterne).
    const userIcon = L.divIcon({
      className: "",
      html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#38bdf8;box-shadow:0 0 0 4px rgba(56,189,248,0.3),0 0 12px rgba(56,189,248,0.8)"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker([center.lat, center.lon], { icon: userIcon })
      .addTo(overlay)
      .bindPopup("La tua posizione");

    // Cerchio dei 30 km attorno all'utente.
    L.circle([center.lat, center.lon], {
      radius: RADIUS_KM * 1000,
      color: "#38bdf8",
      weight: 1,
      opacity: 0.4,
      fillColor: "#38bdf8",
      fillOpacity: 0.04,
    }).addTo(overlay);

    // Freccia di provenienza quando la pioggia è in avvicinamento.
    if (
      approach?.status === "approaching" &&
      approach.fromBearing !== undefined
    ) {
      const origin = destinationPoint(
        center,
        approach.fromBearing,
        RADIUS_KM,
      );
      L.polyline(
        [
          [origin.lat, origin.lon],
          [center.lat, center.lon],
        ],
        {
          color: "#f43f5e",
          weight: 3,
          opacity: 0.8,
          dashArray: "8 8",
        },
      ).addTo(overlay);

      L.circleMarker([origin.lat, origin.lon], {
        radius: 7,
        color: "#f43f5e",
        fillColor: "#f43f5e",
        fillOpacity: 0.9,
      })
        .addTo(overlay)
        .bindPopup(`Pioggia in arrivo da ${approach.fromCardinal ?? ""}`);
    }
  }, [center, approach]);

  // 4) All'arrivo di nuovi frame: pre-creiamo un layer (invisibile) per ciascun
  //    frame e rimuoviamo quelli non più presenti. Pre-caricare i tile evita il
  //    "lampeggio" quando si passa da un frame all'altro.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || frames.length === 0) return;

    const layers = frameLayersRef.current;
    const validTimes = new Set(frames.map((f) => f.time));

    // Rimuovi i layer dei frame non più disponibili.
    layers.forEach((layer, time) => {
      if (!validTimes.has(time)) {
        map.removeLayer(layer);
        layers.delete(time);
      }
    });

    // Crea i layer mancanti. Li teniamo quasi invisibili (0.001 e non 0) così
    // il browser pre-carica davvero i tile: è il trucco usato dall'esempio
    // ufficiale di RainViewer per ottenere un'animazione senza "lampeggio".
    frames.forEach((frame) => {
      if (layers.has(frame.time)) return;
      const layer = L.tileLayer(frame.tileUrl, {
        opacity: 0.001,
        zIndex: 10,
        tileSize: 256,
        // IMPORTANTISSIMO: i tile radar RainViewer esistono SOLO fino allo
        // zoom 7. Oltre questo livello Leaflet deve RISCALARE il tile z7
        // invece di richiederne di inesistenti: senza questo si ottengono
        // tile vuoti e l'errore "zoom level not supported" quando si zooma.
        maxNativeZoom: 7,
        maxZoom: 18,
        updateWhenZooming: false,
        keepBuffer: 4,
      });
      layer.addTo(map);
      layers.set(frame.time, layer);
    });

    // Posizioniamoci sull'ultimo dato osservato (presente).
    let lastPast = frames.findIndex((f) => f.isForecast);
    if (lastPast === -1) lastPast = frames.length - 1;
    else lastPast = Math.max(0, lastPast - 1);
    setFrameIndex(lastPast);
  }, [frames]);

  // 5) Cambio frame: mostriamo solo il layer corrente regolando l'opacità.
  useEffect(() => {
    if (frames.length === 0) return;
    const frame = frames[frameIndex];
    if (!frame) return;

    frameLayersRef.current.forEach((layer, time) => {
      // 0.001 (e non 0) sui frame nascosti: i tile restano pre-caricati.
      layer.setOpacity(time === frame.time ? 0.75 : 0.001);
    });
  }, [frameIndex, frames]);

  // 6) Animazione: avanza il frame quando "playing" è attivo.
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const id = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.length);
    }, 800);
    return () => clearInterval(id);
  }, [playing, frames]);

  const currentFrame = frames[frameIndex];

  return (
    <div className="relative h-full w-full">
      {/* Contenitore della mappa Leaflet */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Controlli radar (play/pausa + timeline + orario) sovrapposti */}
      {frames.length > 0 && (
        <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-[500] flex items-center gap-3 rounded-xl border border-white/10 bg-radar-bg/80 px-3 py-2 backdrop-blur-md">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-radar-accent/15 text-radar-accent ring-1 ring-radar-accent/30 transition hover:bg-radar-accent/25"
            aria-label={playing ? "Pausa" : "Play"}
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={frameIndex}
            onChange={(e) => {
              setPlaying(false);
              setFrameIndex(Number(e.target.value));
            }}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-radar-accent"
          />

          <div className="flex shrink-0 flex-col items-end leading-tight">
            <span className="text-sm font-medium tabular-nums text-slate-100">
              {currentFrame ? formatTime(currentFrame.time) : "--:--"}
            </span>
            <span
              className={`text-[10px] ${
                currentFrame?.isForecast
                  ? "text-radar-warn"
                  : "text-slate-400"
              }`}
            >
              {currentFrame?.isForecast ? "previsione" : "osservato"}
            </span>
          </div>
        </div>
      )}

      {/* Legenda minima in alto a destra */}
      <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-lg border border-white/10 bg-radar-bg/70 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-md">
        Radar pioggia · raggio {RADIUS_KM} km
      </div>
    </div>
  );
}
