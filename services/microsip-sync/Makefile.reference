ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
include $(ROOT)/infrastructure/tooling/commands.mk
PNPM := $(TOOLS_COMPOSE) run --build --rm --no-deps -w /repo/services/microsip-sync tools pnpm
.PHONY: check
check:
	$(PNPM) run lint
	$(PNPM) run check-types
	$(PNPM) run test
	$(PNPM) run build
