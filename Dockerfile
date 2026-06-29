# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Dockerfile multi-stage per Next.js (output: "standalone").
# Pensato per il deploy su VPS tramite Coolify: l'app espone la porta 3000.
# ---------------------------------------------------------------------------

# 1) Dipendenze: installiamo i pacchetti in un layer dedicato e cacheabile.
FROM node:22-alpine AS deps
WORKDIR /app
# libc6-compat aiuta alcune dipendenze native su Alpine.
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# 2) Build: compiliamo l'app Next.js.
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Disabilita la telemetria di Next.js durante la build.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) Runner: immagine finale minimale che esegue il server standalone.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js leggera queste variabili per host/porta di ascolto.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Utente non-root per sicurezza.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copiamo solo l'output standalone, gli asset statici e i file pubblici.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Coolify mappa automaticamente questa porta.
EXPOSE 3000

# server.js è generato dalla build standalone di Next.js.
CMD ["node", "server.js"]
