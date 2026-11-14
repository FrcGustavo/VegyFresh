.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
include $(ROOT)/infrastructure/tooling/commands.mk
PNPM := $(TOOLS) pnpm --filter portal
COMPOSE_PROJECT_NAME ?= vegyfresh-portal
COMPOSE ?= docker compose --project-name "$(COMPOSE_PROJECT_NAME)" --project-directory "$(ROOT)/apps/portal" -f "$(ROOT)/apps/portal/docker-compose.yml"
PORTAL_PORT ?= 5174
DEV_API_URL ?= http://host.docker.internal:3000
DEV_PUBLIC_ORIGIN ?= http://localhost:$(PORTAL_PORT)

export PORTAL_PORT DEV_API_URL DEV_PUBLIC_ORIGIN

.PHONY: help install build lint check-types test check dev run up down logs compose-config
help:
	@printf '%s\n' \
		'Portal development runs in Docker.' \
		'' \
		'  make install       Install dependencies in Docker' \
		'  make dev           Run Vite with hot reload in Docker' \
		'  make up            Start the development container in the background' \
		'  make down          Stop the development container' \
		'  make lint check-types test build check' \
		'  make compose-config Validate the development Compose file'
install:
	$(COMPOSE) run --build --rm --no-deps portal sh -c 'CI=true pnpm install --filter portal... --frozen-lockfile && pnpm --filter @vegyfresh/ui build'
build:
	$(PNPM) run build
check-types:
	$(PNPM) run check-types
test:
	$(PNPM) run test
lint:
	$(PNPM) run lint
run:
	$(COMPOSE) up --build portal
dev: run
up:
	$(COMPOSE) up --detach --build portal
down:
	$(COMPOSE) down --remove-orphans
logs:
	$(COMPOSE) logs --follow portal
compose-config:
	$(COMPOSE) config --quiet
check: lint check-types test build

.PHONY: start docker-build
start:
	docker run --rm --add-host host.docker.internal:host-gateway --env-file "$(ROOT)/apps/portal/.env" -p $(PORTAL_PORT):5174 vegyfresh-portal
docker-build:
	docker build -f $(ROOT)/apps/portal/Dockerfile -t vegyfresh-portal $(ROOT)
