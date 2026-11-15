.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
include $(ROOT)/infrastructure/tooling/commands.mk
PNPM := $(TOOLS_COMPOSE) run --build --rm --no-deps -w /repo/apps/docs tools pnpm
.PHONY: help build check-types lint check dev
help:
	@printf '%s\n' 'Targets: build lint check-types check dev'
build lint check-types:
	$(PNPM) run $@
dev:
	$(TOOLS_COMPOSE) run --build --rm --no-deps -p 127.0.0.1:5175:5175 -w /repo/apps/docs tools pnpm run dev --host 0.0.0.0
check: lint check-types build
