.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
include $(ROOT)/infrastructure/tooling/commands.mk
PNPM := $(TOOLS) pnpm --filter @vegyfresh/seed-api

.PHONY: help install build lint check-types test check run
help:
	@printf '%s\n' 'Targets: install build lint check-types test check run'
install:
	$(TOOLS) true
build check-types test:
	$(PNPM) run $@
lint: check-types
check: lint test build
run:
	$(TOOLS_COMPOSE) run --build --rm --no-deps -e SEED_API_BASE_URL -e SEED_API_BEARER_TOKEN -e SEED_ADMIN_PASSWORD -e SEED_OPERATOR_PASSWORD -e SEED_CONCURRENCY -e SEED_TRANSACTIONAL_CONCURRENCY tools pnpm --filter @vegyfresh/seed-api run seed
