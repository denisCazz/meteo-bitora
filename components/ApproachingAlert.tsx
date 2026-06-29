"use client";

/**
 * Banner di avviso "qualcosa si muove verso di te".
 * Cambia colore, icona e contenuto in base allo stato calcolato da
 * analyzeApproach():
 *  - approaching: rosso/arancio, con freccia direzionale e ETA (massima enfasi)
 *  - raining: blu, sta già piovendo
 *  - nearby: ambra, pioggia vicina ma non in arrivo
 *  - clear: verde, tutto sereno
 */

import {
  AlertTriangle,
  CloudRain,
  Navigation,
  ShieldCheck,
  CloudDrizzle,
} from "lucide-react";
import type { ApproachAnalysis } from "@/lib/approaching";

interface Props {
  analysis: ApproachAnalysis | null;
  loading: boolean;
}

export default function ApproachingAlert({ analysis, loading }: Props) {
  if (!analysis) {
    return (
      <div className="glass h-20 animate-pulse">
        <div className="h-full w-full rounded-2xl bg-white/5" />
      </div>
    );
  }

  const style = getStyle(analysis.status);

  return (
    <div
      className={`glass animate-fade-in-up flex items-center gap-4 border p-4 sm:p-5 ${style.border} ${style.bg}`}
    >
      {/* Icona con eventuale "ping" radar quando c'è un avvicinamento */}
      <div className="relative grid h-12 w-12 shrink-0 place-items-center">
        {analysis.status === "approaching" && (
          <span
            className={`absolute inset-0 rounded-full ${style.ping} animate-radar-ping`}
          />
        )}
        <span
          className={`relative grid h-12 w-12 place-items-center rounded-full ${style.iconBg} ${style.text}`}
        >
          <style.Icon className="h-6 w-6" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${style.text}`}>{style.title}</p>
        <p className="truncate text-sm text-slate-200">{analysis.message}</p>
      </div>

      {/* Bussola direzionale + ETA per l'avvicinamento */}
      {analysis.status === "approaching" &&
        analysis.fromBearing !== undefined && (
          <div className="hidden shrink-0 flex-col items-center gap-1 sm:flex">
            <Navigation
              className={`h-7 w-7 ${style.text}`}
              // La freccia di Lucide punta verso l'alto (Nord): la ruotiamo
              // di 180° + bearing per indicare la direzione di PROVENIENZA.
              style={{
                transform: `rotate(${analysis.fromBearing + 180}deg)`,
              }}
            />
            <span className="text-[11px] text-slate-400">
              da {analysis.fromCardinal}
            </span>
          </div>
        )}

      {loading && (
        <span className="hidden text-xs text-slate-400 sm:inline">
          aggiorno…
        </span>
      )}
    </div>
  );
}

interface AlertStyle {
  title: string;
  Icon: typeof AlertTriangle;
  text: string;
  bg: string;
  border: string;
  iconBg: string;
  ping: string;
}

function getStyle(status: ApproachAnalysis["status"]): AlertStyle {
  switch (status) {
    case "approaching":
      return {
        title: "In avvicinamento",
        Icon: AlertTriangle,
        text: "text-radar-danger",
        bg: "bg-radar-danger/10",
        border: "border-radar-danger/40",
        iconBg: "bg-radar-danger/15",
        ping: "bg-radar-danger/30",
      };
    case "raining":
      return {
        title: "Pioggia in corso",
        Icon: CloudRain,
        text: "text-radar-accent",
        bg: "bg-radar-accent/10",
        border: "border-radar-accent/30",
        iconBg: "bg-radar-accent/15",
        ping: "bg-radar-accent/30",
      };
    case "nearby":
      return {
        title: "Pioggia nelle vicinanze",
        Icon: CloudDrizzle,
        text: "text-radar-warn",
        bg: "bg-radar-warn/10",
        border: "border-radar-warn/30",
        iconBg: "bg-radar-warn/15",
        ping: "bg-radar-warn/30",
      };
    case "clear":
    default:
      return {
        title: "Tutto sereno",
        Icon: ShieldCheck,
        text: "text-radar-ok",
        bg: "bg-radar-ok/10",
        border: "border-radar-ok/30",
        iconBg: "bg-radar-ok/15",
        ping: "bg-radar-ok/30",
      };
  }
}
