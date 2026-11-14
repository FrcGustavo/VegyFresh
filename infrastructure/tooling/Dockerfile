FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends make && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
WORKDIR /repo
COPY infrastructure/tooling/entrypoint.sh /usr/local/bin/workspace-tools
ENTRYPOINT ["sh", "/usr/local/bin/workspace-tools"]
CMD ["pnpm", "check"]
