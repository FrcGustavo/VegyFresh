.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
include $(ROOT)/infrastructure/tooling/commands.mk
PNPM := $(TOOLS) pnpm --filter @vegyfresh/api-client

.PHONY: help install build lint check-types test check generate export contract
help:
	@printf '%s\n' 'Targets: install build lint check-types test check generate export contract'
install:
	$(TOOLS) true
build check-types test:
	$(PNPM) run $@
lint: check-types
check: lint test build
# Optional schema location is passed through without interpolating its value into the shell.
generate:
	$(TOOLS_COMPOSE) run --build --rm --no-deps -e API_SCHEMA_URL -e VITE_API_URL_JSON tools pnpm --filter @vegyfresh/api-client run generate:api-types
export:
	$(TOOLS) pnpm --filter backend export:openapi
contract:
	$(PNPM) run check:contract
