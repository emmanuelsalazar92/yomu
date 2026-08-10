FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 MEDIA_ROOT=/app/uploads
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 yomu && mkdir -p /app/uploads && chown -R yomu:nodejs /app
COPY --from=production-dependencies --chown=yomu:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=yomu:nodejs /app/.next/standalone ./
COPY --from=builder --chown=yomu:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=yomu:nodejs /app/public ./public
COPY --from=builder --chown=yomu:nodejs /app/prisma ./prisma
COPY --from=builder --chown=yomu:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
USER yomu
EXPOSE 3000
ENTRYPOINT ["/bin/sh","./docker-entrypoint.sh"]
