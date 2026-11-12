.DEFAULT_GOAL := help
NODE_IMAGE ?= node:20-bookworm-slim

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
	docker run --rm --mount type=bind,source="$(CURDIR)",target=/work,readonly --workdir /work $(NODE_IMAGE) node --test realm.test.mjs

check: config test
