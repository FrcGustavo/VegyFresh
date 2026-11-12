.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
DOCKER := docker run --rm -v "$(ROOT):/workspace" -w /workspace node:24-bookworm-slim
PNPM := $(DOCKER) sh -c 'corepack enable && pnpm --filter @vegyfresh/ui run $$1' --
.PHONY: help build check-types lint test check
help:
	@printf '%s\n' 'Targets: build lint check-types test check'
build lint check-types test:
	$(PNPM) $@
check: lint check-types test build
