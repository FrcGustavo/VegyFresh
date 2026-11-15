FROM node:24-bookworm-slim AS development
WORKDIR /repo
ENV NODE_ENV=development
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
COPY packages/ui/package.json packages/ui/pnpm-lock.yaml packages/ui/
COPY clients/api-client/package.json clients/api-client/pnpm-lock.yaml clients/api-client/
COPY apps/frontend/package.json apps/frontend/pnpm-lock.yaml apps/frontend/
RUN (cd packages/ui && pnpm install --frozen-lockfile) \
  && (cd clients/api-client && pnpm install --frozen-lockfile) \
  && (cd apps/frontend && pnpm install --frozen-lockfile)
EXPOSE 5173
CMD ["sh", "-c", "cd /repo/apps/frontend && pnpm run dev"]

FROM development AS build
COPY packages/ui packages/ui
COPY clients/api-client clients/api-client
COPY apps/frontend apps/frontend
RUN (cd packages/ui && pnpm run build) \
  && (cd apps/frontend && pnpm run build)

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
ENV HOST=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/frontend/.output ./
USER node
EXPOSE 80
CMD ["node", "server/index.mjs"]
