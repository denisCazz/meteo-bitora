import type { Metadata, Viewport } from "next";
import "./globals.css";

// Metadati dell'applicazione (Server Component)
export const metadata: Metadata = {
  title: "Meteo Radar · Avvicinamento pioggia in tempo reale",
  description:
    "App meteo moderna con radar interattivo RainViewer e avviso quando la pioggia si muove verso di te.",
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Dark mode nativa: la classe `dark` è applicata sull'elemento <html>
  return (
    <html lang="it" className="dark">
      <body className="min-h-screen text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
