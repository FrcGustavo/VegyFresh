.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
include $(ROOT)/infrastructure/tooling/commands.mk
PNPM := $(TOOLS_COMPOSE) run --build --rm --no-deps -w /repo/jobs/seed-api tools pnpm

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
	$(TOOLS_COMPOSE) run --build --rm --no-deps -w /repo/jobs/seed-api -e SEED_API_BASE_URL -e SEED_API_BEARER_TOKEN -e SEED_CONCURRENCY -e SEED_TRANSACTIONAL_CONCURRENCY tools pnpm run seed
