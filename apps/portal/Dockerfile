FROM node:24-bookworm-slim AS development
WORKDIR /repo
ENV NODE_ENV=development
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
COPY packages/ui/package.json packages/ui/pnpm-lock.yaml packages/ui/
COPY clients/api-client/package.json clients/api-client/pnpm-lock.yaml clients/api-client/
COPY apps/portal/package.json apps/portal/pnpm-lock.yaml apps/portal/
RUN (cd packages/ui && pnpm install --frozen-lockfile) \
  && (cd clients/api-client && pnpm install --frozen-lockfile) \
  && (cd apps/portal && pnpm install --frozen-lockfile)
EXPOSE 5174
CMD ["sh", "-c", "cd /repo/apps/portal && pnpm run dev"]

FROM development AS build
COPY packages/ui packages/ui
COPY clients/api-client clients/api-client
COPY apps/portal apps/portal
RUN (cd packages/ui && pnpm run build) \
  && (cd apps/portal && pnpm run build)

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=5174 HOST=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/portal/.output ./
USER node
EXPOSE 5174
CMD ["node", "server/index.mjs"]
