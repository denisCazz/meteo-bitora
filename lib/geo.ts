/**
 * Utility geografiche: calcolo di punti attorno a una coordinata,
 * distanze e direzioni (bearing) tra coordinate.
 *
 * Servono per il sistema di rilevamento "qualcosa si avvicina":
 * campioniamo la pioggia su una corona di punti attorno all'utente.
 */

export interface LatLng {
  lat: number;
  lon: number;
}

/** Raggio medio terrestre in km */
const EARTH_RADIUS_KM = 6371;

/** Coordinata di fallback: Roma (usata se la geolocalizzazione fallisce) */
export const ROME: LatLng = { lat: 41.9028, lon: 12.4964 };

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Calcola un nuovo punto a partire da `origin`, dato un `bearing` (in gradi,
 * 0 = Nord, 90 = Est) e una `distanceKm`. Formula della destinazione lungo
 * una geodetica (great-circle).
 */
export function destinationPoint(
  origin: LatLng,
  bearingDeg: number,
  distanceKm: number,
): LatLng {
  const angular = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(origin.lat);
  const lon1 = toRad(origin.lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: toDeg(lat2), lon: toDeg(lon2) };
}

/** Distanza in km tra due coordinate (formula dell'emisenoverso / haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Direzione (bearing in gradi, 0 = Nord) dal punto `a` verso il punto `b`. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Converte un bearing in gradi nel punto cardinale italiano più vicino. */
export function bearingToCardinal(bearing: number): string {
  const dirs = [
    "Nord",
    "Nord-Est",
    "Est",
    "Sud-Est",
    "Sud",
    "Sud-Ovest",
    "Ovest",
    "Nord-Ovest",
  ];
  const index = Math.round(bearing / 45) % 8;
  return dirs[index];
}
