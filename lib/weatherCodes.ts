/**
 * Mappatura dei codici meteo WMO (usati da Open-Meteo) verso:
 *  - una descrizione leggibile in italiano
 *  - il nome dell'icona Lucide React da mostrare
 *
 * Riferimento WMO Weather interpretation codes (WW):
 * https://open-meteo.com/en/docs
 */

import type { LucideIcon } from "lucide-react";
import {
  Sun,
  Cloud,
  CloudSun,
  Cloudy,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  Snowflake,
  CloudLightning,
} from "lucide-react";

export interface WeatherInfo {
  /** Descrizione in italiano della condizione meteo */
  label: string;
  /** Icona Lucide associata alla condizione */
  icon: LucideIcon;
}

/**
 * Restituisce descrizione e icona a partire dal codice WMO.
 * `isDay` permette di scegliere l'icona corretta (sole vs nuvola di giorno).
 */
export function getWeatherInfo(code: number, isDay = true): WeatherInfo {
  switch (code) {
    case 0:
      return { label: "Sereno", icon: isDay ? Sun : Cloud };
    case 1:
      return { label: "Prevalentemente sereno", icon: isDay ? CloudSun : Cloud };
    case 2:
      return { label: "Parzialmente nuvoloso", icon: CloudSun };
    case 3:
      return { label: "Coperto", icon: Cloudy };
    case 45:
    case 48:
      return { label: "Nebbia", icon: CloudFog };
    case 51:
    case 53:
    case 55:
      return { label: "Pioviggine", icon: CloudDrizzle };
    case 56:
    case 57:
      return { label: "Pioviggine gelata", icon: CloudDrizzle };
    case 61:
      return { label: "Pioggia debole", icon: CloudRain };
    case 63:
      return { label: "Pioggia moderata", icon: CloudRain };
    case 65:
      return { label: "Pioggia forte", icon: CloudRainWind };
    case 66:
    case 67:
      return { label: "Pioggia gelata", icon: CloudRainWind };
    case 71:
      return { label: "Neve debole", icon: CloudSnow };
    case 73:
      return { label: "Neve moderata", icon: CloudSnow };
    case 75:
      return { label: "Neve forte", icon: Snowflake };
    case 77:
      return { label: "Granelli di neve", icon: Snowflake };
    case 80:
      return { label: "Rovesci deboli", icon: CloudRain };
    case 81:
      return { label: "Rovesci moderati", icon: CloudRain };
    case 82:
      return { label: "Rovesci violenti", icon: CloudRainWind };
    case 85:
    case 86:
      return { label: "Rovesci di neve", icon: CloudSnow };
    case 95:
      return { label: "Temporale", icon: CloudLightning };
    case 96:
    case 99:
      return { label: "Temporale con grandine", icon: CloudLightning };
    default:
      return { label: "Condizioni variabili", icon: Cloud };
  }
}
