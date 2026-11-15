.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
include $(ROOT)/infrastructure/tooling/commands.mk
PNPM := $(TOOLS_COMPOSE) run --build --rm --no-deps -w /repo/packages/ui tools pnpm
.PHONY: help build check-types lint test check
help:
	@printf '%s\n' 'Targets: build lint check-types test check'
build lint check-types test:
	$(PNPM) run $@
check: lint check-types test build
