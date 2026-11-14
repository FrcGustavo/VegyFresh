ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/../..)
PNPM := pnpm --dir $(ROOT) --filter backend

.PHONY: build lint check-types test test-e2e dev migrate docker-build
build lint check-types:
	$(PNPM) run $@
test:
	$(PNPM) run test --runInBand
test-e2e:
	$(ROOT)/services/backend/test/integration/run-external-identity.sh
dev:
	$(PNPM) run dev
migrate:
	$(PNPM) run migrations:run
docker-build:
	docker build -f $(ROOT)/Dockerfile.backend -t vegyfresh-backend:local $(ROOT)
