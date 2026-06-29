/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build "standalone": genera un server Node autonomo con solo le dipendenze
  // necessarie, ideale per immagini Docker leggere (deploy su VPS/Coolify).
  output: "standalone",
};

export default nextConfig;
