FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix frontend
COPY . .
RUN npm run build:production
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=8080 LOCAL_MODE=false DISABLE_SCHEDULER=true SHOP_PREVIEW_ENABLED=false
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json /app/app.js /app/config.js /app/server.js ./
COPY --from=build --chown=node:node /app/consts ./consts
COPY --from=build --chown=node:node /app/controllers ./controllers
COPY --from=build --chown=node:node /app/engine ./engine
COPY --from=build --chown=node:node /app/lib ./lib
COPY --from=build --chown=node:node /app/middleware ./middleware
COPY --from=build --chown=node:node /app/models ./models
COPY --from=build --chown=node:node /app/modules ./modules
COPY --from=build --chown=node:node /app/routes ./routes
COPY --from=build --chown=node:node /app/services ./services
COPY --from=build --chown=node:node /app/utils ./utils
COPY --from=build --chown=node:node /app/scripts/migrateOwnerIndex.js ./scripts/migrateOwnerIndex.js
COPY --from=build --chown=node:node /app/scripts/checkProductionConfig.cjs ./scripts/checkProductionConfig.cjs
COPY --from=build --chown=node:node /app/frontend/dist ./frontend/dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
