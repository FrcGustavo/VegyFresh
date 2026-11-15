FROM node:24-bookworm-slim AS build
WORKDIR /repo/services/backend
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
COPY services/backend/package.json services/backend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY services/backend ./
RUN pnpm run build

FROM build AS prod-deps
RUN CI=true pnpm prune --prod

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
COPY --from=prod-deps /repo/services/backend/package.json ./package.json
COPY --from=prod-deps /repo/services/backend/node_modules ./node_modules
COPY --from=build /repo/services/backend/dist ./dist
COPY services/backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER node
EXPOSE 80
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main"]
