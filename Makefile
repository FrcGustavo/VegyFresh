ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
include $(ROOT)/infrastructure/tooling/commands.mk
COMPOSE_PROJECT_NAME ?= vegyfresh
COMPOSE ?= docker compose --project-name "$(COMPOSE_PROJECT_NAME)" -f "$(ROOT)/compose.yml"
UNITS := clients/api-client services/backend services/microsip-sync apps/frontend apps/portal jobs/seed-api
LINT_UNITS := services/backend services/microsip-sync apps/frontend apps/portal
TEST_UNITS := services/microsip-sync clients/api-client apps/frontend apps/portal jobs/seed-api
.DEFAULT_GOAL := help
.PHONY: help install build lint check-types test check contract
help:
	@printf '%s\n' 'Targets: install build lint check-types test check contract dev up down logs ps compose-config frontend portal backend keycloak-up keycloak-down seed test-runtime test-runtime-frontend test-runtime-portal test-e2e test-images'
install:
	$(TOOLS) true
build:
	$(TOOLS) sh -c 'set -eu; for u in $(UNITS); do (cd "/repo/$$u" && pnpm run build); done'
lint:
	$(TOOLS) sh -c 'set -eu; for u in $(LINT_UNITS); do (cd "/repo/$$u" && pnpm run lint); done; (cd /repo/clients/api-client && pnpm run check-types); (cd /repo/jobs/seed-api && pnpm run check-types)'
check-types:
	$(TOOLS) sh -c 'set -eu; for u in $(UNITS); do (cd "/repo/$$u" && pnpm run check-types); done'
test:
	$(TOOLS) sh -c 'set -eu; (cd /repo/services/backend && pnpm run test --runInBand); for u in $(TEST_UNITS); do (cd "/repo/$$u" && pnpm run test); done'
check:
	$(TOOLS) sh -c 'set -eu; for u in $(LINT_UNITS); do (cd "/repo/$$u" && pnpm run lint); done; for u in $(UNITS); do (cd "/repo/$$u" && pnpm run check-types); done; (cd /repo/services/backend && pnpm run test --runInBand); for u in $(TEST_UNITS); do (cd "/repo/$$u" && pnpm run test); done; for u in $(UNITS); do (cd "/repo/$$u" && pnpm run build); done'
contract:
	$(TOOLS_COMPOSE) run --build --rm --no-deps -w /repo/clients/api-client tools pnpm run check:contract

.PHONY: dev up down logs ps compose-config frontend portal backend keycloak-up keycloak-down seed test-runtime test-runtime-frontend test-runtime-portal test-e2e test-images
dev:
	$(COMPOSE) up --build
up:
	$(COMPOSE) up --detach --build
down:
	$(COMPOSE) down --remove-orphans
logs:
	$(COMPOSE) logs --follow
ps:
	$(COMPOSE) ps
compose-config:
	$(COMPOSE) config --quiet
backend:
	$(COMPOSE) up --build api
frontend portal:
	$(COMPOSE) up --build $@
keycloak-up:
	$(COMPOSE) up --detach keycloak
keycloak-down:
	$(COMPOSE) stop keycloak
	$(COMPOSE) rm --force keycloak
seed:
	$(MAKE) -C jobs/seed-api run
test-runtime:
	$(TOOLS) sh -c 'node --test infrastructure/tooling/smoke-config.test.mjs && (cd /repo/apps/frontend && pnpm run test:start) && (cd /repo/apps/portal && pnpm run test:start)'
test-runtime-frontend:
	$(TOOLS) sh -c 'node --test infrastructure/tooling/smoke-config.test.mjs && (cd /repo/apps/frontend && pnpm run test:start)'
test-runtime-portal:
	$(TOOLS) sh -c 'node --test infrastructure/tooling/smoke-config.test.mjs && (cd /repo/apps/portal && pnpm run test:start)'
test-e2e:
	$(MAKE) -C services/backend test-e2e
# APP is explicitly selected; image names do not determine the application.
test-images:
	@test -n "$(APP)" -a -n "$(IMAGE)" || { echo 'Set APP=admin|portal and IMAGE=<tag>.' >&2; exit 1; }
	$(TOOLS_COMPOSE) run --build --rm --no-deps --use-aliases image-tests --app $(APP) --image $(IMAGE)
