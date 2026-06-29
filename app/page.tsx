import { Radar } from "lucide-react";
import WeatherDashboard from "@/components/WeatherDashboard";

/**
 * Pagina principale (Server Component).
 * Si occupa solo della struttura statica della pagina: intestazione, layout
 * e footer. Tutta la logica interattiva (geolocalizzazione, fetch dei dati,
 * mappa radar) è delegata al Client Component <WeatherDashboard />.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {/* Intestazione */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-radar-accent/15 text-radar-accent ring-1 ring-radar-accent/30">
            <Radar className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              Meteo Radar
            </h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              Radar in tempo reale e avviso pioggia in avvicinamento
            </p>
          </div>
        </div>
      </header>

      {/* Contenuto interattivo */}
      <WeatherDashboard />

      {/* Footer con crediti alle sorgenti dati */}
      <footer className="mt-auto pt-4 text-center text-xs text-slate-500">
        Dati meteo:{" "}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="text-radar-accent/80 hover:text-radar-accent"
        >
          Open-Meteo
        </a>{" "}
        · Radar:{" "}
        <a
          href="https://www.rainviewer.com/"
          target="_blank"
          rel="noreferrer"
          className="text-radar-accent/80 hover:text-radar-accent"
        >
          RainViewer
        </a>{" "}
        · Mappa:{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="text-radar-accent/80 hover:text-radar-accent"
        >
          OpenStreetMap
        </a>
      </footer>
    </main>
  );
}
