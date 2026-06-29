"use client";

/**
 * Card del meteo attuale: temperatura, condizione (icona), probabilità di
 * pioggia attuale e qualche dato secondario (percepita, umidità, vento).
 */

import { Droplets, Thermometer, Wind, Umbrella } from "lucide-react";
import { getWeatherInfo } from "@/lib/weatherCodes";
import type { CurrentWeather } from "@/lib/openMeteo";

interface Props {
  current: CurrentWeather | null;
  loading: boolean;
}

export default function CurrentWeatherCard({ current, loading }: Props) {
  if (loading && !current) {
    return (
      <div className="glass h-44 animate-pulse p-5">
        <div className="h-full w-full rounded-xl bg-white/5" />
      </div>
    );
  }

  if (!current) return null;

  const { label, icon: Icon } = getWeatherInfo(
    current.weatherCode,
    current.isDay,
  );

  return (
    <div className="glass animate-fade-in-up p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">Adesso</p>
          <div className="mt-1 flex items-end gap-1">
            <span className="text-5xl font-semibold tracking-tighter">
              {current.temperature}°
            </span>
            <span className="mb-1 text-slate-400">C</span>
          </div>
          <p className="mt-1 text-sm text-slate-300">{label}</p>
        </div>
        <Icon className="h-14 w-14 text-radar-accent" strokeWidth={1.5} />
      </div>

      {/* Probabilità di pioggia attuale in evidenza */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-radar-accent/10 px-4 py-3 ring-1 ring-radar-accent/20">
        <div className="flex items-center gap-2 text-sm text-slate-200">
          <Umbrella className="h-4 w-4 text-radar-accent" />
          Probabilità di pioggia
        </div>
        <span className="text-xl font-semibold text-radar-accent">
          {current.precipitationProbability}%
        </span>
      </div>

      {/* Dati secondari */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Metric
          icon={<Thermometer className="h-4 w-4" />}
          label="Percepita"
          value={`${current.apparentTemperature}°`}
        />
        <Metric
          icon={<Droplets className="h-4 w-4" />}
          label="Umidità"
          value={`${current.humidity}%`}
        />
        <Metric
          icon={<Wind className="h-4 w-4" />}
          label="Vento"
          value={`${current.windSpeed} km/h`}
        />
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 px-2 py-3">
      <div className="mx-auto mb-1 flex w-fit items-center text-slate-400">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-100">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
