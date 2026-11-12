.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
DOCKER := docker run --rm -v "$(ROOT):/workspace" -w /workspace node:24-bookworm-slim
PNPM := $(DOCKER) sh -c 'corepack enable && pnpm --filter @vegyfresh/ui build && pnpm --filter @vegyfresh/docs run $$1' --
.PHONY: help build check-types lint check dev
help:
	@printf '%s\n' 'Targets: build lint check-types check dev'
build lint check-types:
	$(PNPM) $@
dev:
	docker run --rm -p 5175:5175 -v "$(ROOT):/workspace" -w /workspace node:24-bookworm-slim sh -c 'corepack enable && pnpm --filter @vegyfresh/ui build && pnpm --filter @vegyfresh/docs dev --host 0.0.0.0'
check: lint check-types build
