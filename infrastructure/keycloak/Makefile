.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
include $(ROOT)/infrastructure/tooling/commands.mk

.PHONY: help config install up down logs test check
help:
	@printf '%s\n' 'Targets: config install up down logs test check'

config:
	docker compose -f compose.yml config --quiet

install:
	docker compose -f compose.yml pull

up:
	docker compose -f compose.yml up -d

down:
	docker compose -f compose.yml down

logs:
	docker compose -f compose.yml logs -f keycloak

test:
	$(TOOLS) node --test infrastructure/keycloak/realm.test.mjs

check: config test
