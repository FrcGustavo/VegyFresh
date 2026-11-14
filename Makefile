ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
include $(ROOT)/infrastructure/tooling/commands.mk
.DEFAULT_GOAL := help
.PHONY: help install build lint check-types test check contract
help:
	@printf '%s\n' 'Targets: install build lint check-types test check contract dev down frontend portal backend keycloak-up keycloak-down seed test-runtime test-e2e test-images'
install:
	$(TOOLS) true
build lint check-types test check:
	$(TOOLS) pnpm run $@
contract:
	$(TOOLS) pnpm --filter @vegyfresh/api-client check:contract

.PHONY: dev down frontend portal backend keycloak-up keycloak-down seed test-runtime test-e2e test-images
dev:
	$(MAKE) -C services/backend up
	$(MAKE) -j2 frontend portal
down:
	$(MAKE) -C apps/frontend down
	$(MAKE) -C apps/portal down
	$(MAKE) -C services/backend down
backend frontend portal:
	$(MAKE) -C $(if $(filter backend,$@),services,apps)/$@ dev
keycloak-up:
	$(MAKE) -C infrastructure/keycloak up
keycloak-down:
	$(MAKE) -C infrastructure/keycloak down
seed:
	$(MAKE) -C jobs/seed-api run
test-runtime:
	$(TOOLS) sh -c 'node --test infrastructure/tooling/smoke-config.test.mjs && pnpm --filter frontend test:start && pnpm --filter portal test:start'
test-e2e:
	$(MAKE) -C services/backend test-e2e
# APP is explicitly selected; image names do not determine the application.
test-images:
	@test -n "$(APP)" -a -n "$(IMAGE)" || { echo 'Set APP=admin|portal and IMAGE=<tag>.' >&2; exit 1; }
	$(TOOLS_COMPOSE) run --build --rm --no-deps --use-aliases image-tests --app $(APP) --image $(IMAGE)
