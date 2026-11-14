.DEFAULT_GOAL := help

ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
include $(ROOT)/infrastructure/tooling/commands.mk
PNPM := $(TOOLS) pnpm --filter backend
ENV_FILE ?= $(ROOT)/services/backend/.env
COMPOSE_PROJECT_NAME ?= vegyfresh-backend
COMPOSE ?= docker compose --project-name "$(COMPOSE_PROJECT_NAME)" --env-file "$(ENV_FILE)" -f "$(ROOT)/services/backend/compose.yml"
E2E_RUN_ID := $(shell date +%s)-$(shell printf '%s' $$$$)
E2E_PROJECT_NAME ?= vegyfresh-backend-e2e-$(E2E_RUN_ID)
E2E_COMPOSE ?= docker compose --project-name "$(E2E_PROJECT_NAME)" -f "$(ROOT)/services/backend/compose.e2e.yml"
IMAGE ?= vegyfresh-backend
TAG ?= local

export ENV_FILE

.PHONY: help install build lint lint-fix check-types test test-e2e check dev up down db-up logs shell migrate compose-config docker-build

help:
	@printf '%s\n' \
		'Backend API commands:' \
		'' \
		'  make install       Build the local development image' \
		'  make dev           Run PostgreSQL, migrations, and the API in the foreground' \
		'  make up            Start PostgreSQL, migrations, and API in the background' \
		'  make down          Stop containers without deleting the database volume' \
		'  make db-up         Start only the local PostgreSQL container' \
		'  make logs          Follow API logs' \
		'  make shell         Open a shell in a one-off development container' \
		'  make migrate       Run pending migrations against the Compose PostgreSQL' \
		'  make test-e2e      Run identity/tenant tests against an ephemeral PostgreSQL' \
		'  make lint check-types test build check' \
		'  make compose-config Validate Compose using the selected ENV_FILE' \
		'  make docker-build  Build the production image with repository-root context' \
		'' \
		'Set ENV_FILE=$(ROOT)/services/backend/.env.example for configuration checks or copy services/backend/.env.example to services/backend/.env for development.'

install:
	$(COMPOSE) build api migrate

build:
	$(PNPM) run build

lint:
	$(PNPM) run lint

lint-fix:
	$(PNPM) run lint:fix

check-types:
	$(PNPM) run check-types

test:
	$(PNPM) run test --runInBand

test-e2e:
	@set -eu; \
	trap '$(E2E_COMPOSE) down --volumes --remove-orphans' EXIT; \
	$(E2E_COMPOSE) up --detach --wait db; \
	$(E2E_COMPOSE) run --rm test

check: lint check-types test build

dev:
	$(COMPOSE) up --build api

up:
	$(COMPOSE) up --detach --build api

down:
	$(COMPOSE) down --remove-orphans

db-up:
	$(COMPOSE) up --detach db

logs:
	$(COMPOSE) logs --follow api

shell:
	$(COMPOSE) run --build --rm --no-deps api sh

migrate:
	$(COMPOSE) run --build --rm migrate

compose-config:
	@test -f "$(ENV_FILE)" || { echo "Missing $(ENV_FILE); copy .env.example or pass ENV_FILE=$(ROOT)/services/backend/.env.example." >&2; exit 1; }
	$(COMPOSE) config --quiet

docker-build:
	docker build -f "$(ROOT)/services/backend/Dockerfile" --target runtime --tag "$(IMAGE):$(TAG)" "$(ROOT)"
