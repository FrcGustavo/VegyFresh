# VegyFresh

VegyFresh is a monorepo for an administrator application, customer portal and tenant-aware API.

| Unit | Responsibility |
| --- | --- |
| `apps/frontend` | Administrator web application |
| `apps/portal` | Customer portal |
| `apps/docs` | Shared UI catalogue |
| `services/backend` | NestJS API and PostgreSQL integration |
| `clients/api-client` | Shared API client and generated contract |
| `packages/ui` | Shared UI primitives and themes |
| `jobs/seed-api` | Finite API seed |
| `infrastructure/keycloak` | Local identity provider and realm |

## Checks

Docker and Docker Compose run the workspace checks without host Node. The tooling container uses Node 24 and pnpm 10.11:

```sh
make install
make check
make contract
```

Individual targets include `make lint`, `make check-types`, `make test` and `make build`. See [workspace tooling](infrastructure/tooling/README.md) for dependency updates and volume usage. Each unit also documents its own development and deployment commands.

## Authentication and runtime

Keycloak provides identity. The two web applications run TanStack Start servers with separate same-origin API proxies and encrypted server-managed session cookies. The API remains authoritative for organization access and permissions. See [identity setup](infrastructure/keycloak/README.md), [administrator runtime](apps/frontend/README.md), [portal runtime](apps/portal/README.md), and [API setup](services/backend/README.md). Existing accounts require explicit identity links; do not assume email alone links an account.

Build the application images from the repository root using `apps/frontend/Dockerfile`, `apps/portal/Dockerfile`, `apps/docs/Dockerfile`, or `services/backend/Dockerfile`. Runtime configuration belongs in the deployment environment, not in the image. The API exposes Swagger at `/api/docs` and OpenAPI JSON at `/api/docs-json`. See [seed configuration](jobs/seed-api/README.md) before targeting an API with the seed job.

## Unit commands and validation

From the repository root, `make dev` (or `make up`) starts the unified `vegyfresh` Docker Compose stack (`keycloak`, `db`, `migrate`, `api`, `frontend`, `portal`, and `docs`), and `make down` stops it. Each unit also owns its own `Makefile` (and `Dockerfile`/`compose` when required) for standalone commands; for example, `make -C clients/api-client check`
checks the shared client, `make -C jobs/seed-api check` validates the seed
without running it, and `make -C apps/docs dev` serves the UI catalogue in isolation.
`make test-runtime` exercises the built web servers with disposable fixtures;
`make test-e2e` runs the backend identity suites in an isolated database.
`make test-images APP=admin IMAGE=<tag>` (or `APP=portal`) checks a built web
image. See [repository units](docs/architecture/units.md) and [contracts](docs/architecture/contracts.md).
