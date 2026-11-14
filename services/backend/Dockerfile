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
RUN pnpm install --filter backend... --frozen-lockfile
COPY services/backend services/backend
RUN pnpm --filter backend build
RUN pnpm --filter backend deploy --prod --legacy /app

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
COPY --from=build /app ./
COPY --from=build /repo/services/backend/dist ./dist
COPY services/backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER node
EXPOSE 80
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main"]
