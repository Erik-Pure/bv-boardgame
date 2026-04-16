# bv-boardgame — spelserver (Fastify + WebSocket) för CapRover / Docker.
#
# - Flerstegsbygge: bygger i builder, kopierar bara det som behövs till slutimage (mindre yta).
# - npm prune --omit=dev efter build tar bort TypeScript m.m. från node_modules.
# - Kör som användaren `node` (finns i officiella node-bilden).
# - HEALTHCHECK mot /health (använder PORT som CapRover sätter, annars 3001).
#
# I CapRover: sätt appens HTTP-port till samma port som processen lyssnar på (process.env.PORT).

# ---------- build ----------
FROM node:22-alpine AS builder
WORKDIR /app
ENV CI=true

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci \
  && npm run -w @bv/game-core build \
  && npm run -w server build \
  && npm prune --omit=dev

# ---------- production ----------
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=node:node /app/packages ./packages
COPY --from=builder --chown=node:node /app/apps ./apps

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD /bin/sh -c 'wget -q -O- "http://127.0.0.1:${PORT:-3001}/health" >/dev/null || exit 1'

CMD ["node", "apps/server/dist/index.js"]
