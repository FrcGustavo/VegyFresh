FROM docker:29-cli AS docker-cli
FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends make && rm -rf /var/lib/apt/lists/*
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
WORKDIR /repo
COPY infrastructure/tooling/entrypoint.sh /usr/local/bin/workspace-tools
ENTRYPOINT ["sh", "/usr/local/bin/workspace-tools"]
CMD ["sh", "-c", "for u in clients/api-client services/backend apps/frontend apps/portal jobs/seed-api; do (cd \"/repo/$$u\" && pnpm run check-types); done"]
