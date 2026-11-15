.DEFAULT_GOAL := help
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
include $(ROOT)/infrastructure/tooling/commands.mk
COMPOSE_PROJECT_NAME ?= vegyfresh-keycloak
COMPOSE ?= docker compose --project-name "$(COMPOSE_PROJECT_NAME)" --project-directory "$(ROOT)/infrastructure/keycloak" -f "$(ROOT)/infrastructure/keycloak/compose.yml"

.PHONY: help config compose-config install dev up down logs test check
help:
	@printf '%s\n' 'Targets: config compose-config install dev up down logs test check'

config compose-config:
	$(COMPOSE) config --quiet

install:
	$(COMPOSE) pull

dev:
	$(COMPOSE) up keycloak

up:
	$(COMPOSE) up -d keycloak

down:
	$(COMPOSE) down --remove-orphans

logs:
	$(COMPOSE) logs -f keycloak

test:
	$(TOOLS) node --test infrastructure/keycloak/realm.test.mjs

check: config test
