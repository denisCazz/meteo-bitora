import type { Config } from "tailwindcss";

const config: Config = {
  // Dark mode forzata a livello di classe sull'elemento <html>
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette personalizzata per il tema scuro "radar"
        radar: {
          bg: "#070b14",
          panel: "rgba(17, 25, 40, 0.55)",
          accent: "#38bdf8",
          danger: "#f43f5e",
          warn: "#f59e0b",
          ok: "#34d399",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        // Pulsazione usata per l'alert "qualcosa si avvicina"
        "radar-ping": {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "70%": { transform: "scale(2.2)", opacity: "0" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "radar-ping": "radar-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite",
        "fade-in-up": "fade-in-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
