.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
include $(ROOT)/infrastructure/tooling/commands.mk
PNPM := $(TOOLS_COMPOSE) run --build --rm --no-deps -w /repo/apps/docs tools pnpm
COMPOSE_PROJECT_NAME ?= vegyfresh-docs
COMPOSE ?= docker compose --project-name "$(COMPOSE_PROJECT_NAME)" --project-directory "$(ROOT)/apps/docs" -f "$(ROOT)/apps/docs/docker-compose.yml"
DOCS_PORT ?= 5175

export DOCS_PORT

.PHONY: help install build lint check-types check dev run up down logs compose-config start docker-build
help:
	@printf '%s\n' \
		'Docs catalogue development runs in Docker.' \
		'' \
		'  make install         Install dependencies in Docker' \
		'  make dev             Run Vite catalogue with hot reload in Docker' \
		'  make up              Start the development container in the background' \
		'  make down            Stop the development container' \
		'  make logs            Follow catalogue logs' \
		'  make lint check-types build check' \
		'  make compose-config  Validate the development Compose file' \
		'  make docker-build    Build the production image' \
		'  make start           Run the built production image'
install:
	$(COMPOSE) run --build --rm --no-deps docs sh -c '(cd /repo/packages/ui && CI=true pnpm install --frozen-lockfile && pnpm run build) && (cd /repo/apps/docs && CI=true pnpm install --frozen-lockfile)'
build lint check-types:
	$(PNPM) run $@
run:
	$(COMPOSE) up --build docs
dev: run
up:
	$(COMPOSE) up --detach --build docs
down:
	$(COMPOSE) down --remove-orphans
logs:
	$(COMPOSE) logs --follow docs
compose-config:
	$(COMPOSE) config --quiet
check: lint check-types build
start:
	docker run --rm -p $(DOCS_PORT):5175 vegyfresh-docs
docker-build:
	docker build -f $(ROOT)/apps/docs/Dockerfile -t vegyfresh-docs $(ROOT)
