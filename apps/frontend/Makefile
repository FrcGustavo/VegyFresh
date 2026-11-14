.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
include $(ROOT)/infrastructure/tooling/commands.mk
PNPM := $(TOOLS) pnpm --filter frontend
COMPOSE_PROJECT_NAME ?= vegyfresh-frontend
COMPOSE ?= docker compose --project-name "$(COMPOSE_PROJECT_NAME)" --project-directory "$(ROOT)/apps/frontend" -f "$(ROOT)/apps/frontend/docker-compose.yml"
FRONTEND_PORT ?= 5173
DEV_API_URL ?= http://host.docker.internal:3000
DEV_PUBLIC_ORIGIN ?= http://localhost:$(FRONTEND_PORT)

export FRONTEND_PORT DEV_API_URL DEV_PUBLIC_ORIGIN

.PHONY: help install build lint check-types test check dev run up down logs compose-config
help:
	@printf '%s\n' \
		'Frontend development runs in Docker.' \
		'' \
		'  make install       Install dependencies in Docker' \
		'  make dev           Run Vite with hot reload in Docker' \
		'  make up            Start the development container in the background' \
		'  make down          Stop the development container' \
		'  make lint check-types test build check' \
		'  make compose-config Validate the development Compose file'
install:
	$(COMPOSE) run --build --rm --no-deps frontend sh -c 'CI=true pnpm install --filter frontend... --frozen-lockfile'
build:
	$(PNPM) run build
check-types:
	$(PNPM) run check-types
test:
	$(PNPM) run test
lint:
	$(PNPM) run lint
run:
	$(COMPOSE) up --build frontend
dev: run
up:
	$(COMPOSE) up --detach --build frontend
down:
	$(COMPOSE) down --remove-orphans
logs:
	$(COMPOSE) logs --follow frontend
compose-config:
	$(COMPOSE) config --quiet
check: lint check-types test build

.PHONY: start docker-build
start:
	docker run --rm --add-host host.docker.internal:host-gateway --env-file "$(ROOT)/apps/frontend/.env" -p $(FRONTEND_PORT):80 vegyfresh-frontend
docker-build:
	docker build -f $(ROOT)/apps/frontend/Dockerfile -t vegyfresh-frontend $(ROOT)
