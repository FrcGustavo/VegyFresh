TOOLS_COMPOSE := docker compose --project-name vegyfresh-tools -f "$(ROOT)/infrastructure/tooling/compose.yml"
TOOLS := $(TOOLS_COMPOSE) run --build --rm --no-deps tools
