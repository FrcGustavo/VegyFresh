FROM node:24-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/portal/package.json apps/portal/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY services/backend/package.json services/backend/package.json
COPY clients/api-client/package.json clients/api-client/package.json
COPY jobs/seed-api/package.json jobs/seed-api/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --filter portal... --frozen-lockfile
COPY apps/portal apps/portal
COPY clients/api-client clients/api-client
COPY packages/ui packages/ui
RUN pnpm --filter @vegyfresh/ui build && pnpm --filter portal build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=5174 HOST=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/portal/.output ./
USER node
EXPOSE 5174
CMD ["node", "server/index.mjs"]
