ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
include $(ROOT)/infrastructure/tooling/commands.mk
.DEFAULT_GOAL := help
.PHONY: help install build lint check-types test check contract
help:
	@printf '%s\n' 'Targets: install build lint check-types test check contract'
install:
	$(TOOLS) true
build lint check-types test check:
	$(TOOLS) pnpm run $@
contract:
	$(TOOLS) pnpm --filter @vegyfresh/api-client check:contract
