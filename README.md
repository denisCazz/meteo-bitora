# Meteo Radar

App meteo moderna, minimale e responsive con **focus sul radar** e un sistema
di avviso quando la pioggia **si sta muovendo verso di te**.

Costruita con **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**,
**Lucide React** e **Leaflet** (nativo, senza SSR). Tutti i dati provengono da
API gratuite **senza API key**: [Open-Meteo](https://open-meteo.com/) per il
meteo e [RainViewer](https://www.rainviewer.com/) per i tile radar.

## Funzionalità

- **Geolocalizzazione**: all'avvio l'app chiede la posizione tramite la
  Geolocation API. In caso di rifiuto o errore, fallback su **Roma**.
- **Meteo attuale** (Open-Meteo): temperatura, condizione con icona,
  **probabilità di pioggia attuale** e previsione oraria per le **prossime 6 ore**.
- **Radar interattivo** (Leaflet + RainViewer): mappa scura centrata
  sull'utente con **zoom 10** (~30 km di raggio), overlay radar **animato**
  (play/pausa + timeline) con frame osservati e di previsione (nowcast).
- **Avviso di avvicinamento**: campionando la precipitazione prevista su una
  corona di 8 punti cardinali attorno all'utente, l'app stima se una cella
  piovosa sta entrando verso il centro, **da quale direzione** e con quale
  **tempo di arrivo stimato**. La direzione è mostrata anche sulla mappa.
- **Design**: dark mode nativa, card glassmorphism, ottimizzato desktop/mobile.

## Struttura dei file

```
app/
  layout.tsx        # Server Component: metadati, dark mode, struttura HTML
  page.tsx          # Server Component: layout statico (header/footer)
  globals.css       # Tailwind + stili glassmorphism e tema scuro Leaflet
components/
  WeatherDashboard.tsx   # Client: geolocalizzazione, fetch, orchestrazione
  RadarMap.tsx           # Client: mappa Leaflet nativa + radar animato
  CurrentWeatherCard.tsx # Client: meteo attuale
  HourlyPrecip.tsx       # Client: probabilità pioggia prossime 6 ore
  ApproachingAlert.tsx   # Client: banner avviso avvicinamento
lib/
  openMeteo.ts      # Client API Open-Meteo (forecast + multi-punto)
  rainviewer.ts     # Client API RainViewer (frame radar)
  approaching.ts    # Algoritmo di rilevamento "pioggia in avvicinamento"
  geo.ts            # Utility geografiche (destination point, bearing, ecc.)
  weatherCodes.ts   # Mappatura codici WMO -> descrizione IT + icona Lucide
```

I **Server Components** (`app/layout.tsx`, `app/page.tsx`) definiscono la
struttura statica; tutta la logica che richiede le API del browser
(geolocalizzazione, Leaflet) vive nei **Client Components**.

## Avvio

```bash
npm install
npm run dev      # sviluppo su http://localhost:3000
npm run build    # build di produzione
npm run start    # avvio in produzione
```

## Note sull'algoritmo di avvicinamento

Open-Meteo permette di interrogare **più coordinate in un'unica richiesta** e
fornisce la precipitazione ogni 15 minuti (`minutely_15`). Per stimare il moto
della pioggia:

1. si campionano centro + 8 punti su una corona di ~18 km;
2. si individua il primo istante in cui la pioggia raggiungerà il centro
   (tempo di arrivo);
3. si calcola la **media circolare dei bearing** pesata per la precipitazione
   della corona, ottenendo la direzione di **provenienza**;
4. l'intensità di picco viene classificata in debole/moderata/forte.
