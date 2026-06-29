"use client";

/**
 * Previsione oraria della probabilità di pioggia per le prossime 6 ore.
 * Ogni ora è rappresentata da una barra verticale proporzionale alla
 * probabilità, con l'orario sotto.
 */

import { CloudRain } from "lucide-react";
import type { HourlyPrecip as HourlyPrecipData } from "@/lib/openMeteo";

interface Props {
  hours: HourlyPrecipData[];
  loading: boolean;
}

/** Formatta l'orario ISO in "HH:00". */
function formatHour(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}`;
}

export default function HourlyPrecip({ hours, loading }: Props) {
  if (loading && hours.length === 0) {
    return (
      <div className="glass h-52 animate-pulse p-5">
        <div className="h-full w-full rounded-xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="glass animate-fade-in-up p-5">
      <div className="mb-4 flex items-center gap-2">
        <CloudRain className="h-4 w-4 text-radar-accent" />
        <h2 className="text-sm font-medium text-slate-200">
          Probabilità pioggia · prossime 6 ore
        </h2>
      </div>

      <div className="flex items-end justify-between gap-2">
        {hours.map((h) => {
          const p = h.precipitationProbability;
          return (
            <div key={h.time} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-medium text-slate-300">
                {p}%
              </span>
              {/* Barra: l'altezza è proporzionale alla probabilità */}
              <div className="flex h-24 w-full items-end overflow-hidden rounded-md bg-white/5">
                <div
                  className="w-full rounded-md bg-gradient-to-t from-radar-accent/40 to-radar-accent transition-all"
                  style={{ height: `${Math.max(p, 3)}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-500">
                {formatHour(h.time)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
