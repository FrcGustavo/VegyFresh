# VegyFresh

VegyFresh is a monorepo for an administrator application, customer portal and tenant-aware API.

| Unit | Responsibility |
| --- | --- |
| `apps/frontend` | Administrator web application |
| `apps/portal` | Customer portal |
| `services/backend` | NestJS API and PostgreSQL integration |
| `services/microsip-sync` | Local order synchronizer with durable history and Microsip simulator |
| `clients/api-client` | Shared API client and generated contract |
| `jobs/seed-api` | Finite API seed |

## Checks

Docker and Docker Compose run the workspace checks without host Node. The tooling container uses Node 24 and pnpm 10.11:

```sh
make install
make check
make contract
```

Individual targets include `make lint`, `make check-types`, `make test` and `make build`. See [workspace tooling](infrastructure/tooling/README.md) for dependency updates and volume usage. Each unit also documents its own development and deployment commands.

The [Microsip synchronizer](services/microsip-sync/README.md) runs separately next to Microsip. Its .NET 10 engine supports local verification with a persistent simulator; a separate Windows x86 DLL bridge is prepared, with real license, catalog and recovery validation pending an authorized pilot.

## Authentication and runtime

The two web applications use OpenID Connect for sign-in and OAuth 2.0 access tokens for the API. Auth0 provides identity for the development stack. The TanStack Start servers use separate same-origin API proxies and protected session cookies. The API resolves permissions and organization or customer access from VegyFresh data. See [OIDC and Auth0 setup](docs/architecture/authentication.md), [administrator runtime](apps/frontend/README.md), [portal runtime](apps/portal/README.md), and [API setup](services/backend/README.md).

Build the application images from the repository root using `apps/frontend/Dockerfile`, `apps/portal/Dockerfile`, or `services/backend/Dockerfile`. Runtime configuration belongs in the deployment environment, not in the image. The API exposes Swagger at `/api/docs` and OpenAPI JSON at `/api/docs-json`. See [seed configuration](jobs/seed-api/README.md) before targeting an API with the seed job.

## Unit commands and validation

Configure the root `.env` using the [Auth0 setup guide](docs/architecture/authentication.md). From the repository root, `make dev` or `make up` starts `db`, `migrate`, `api`, `frontend`, and `portal`. `make down` stops the stack. Each unit also owns its own `Makefile` and any Docker definitions it needs for standalone commands. For example, `make -C clients/api-client check`
checks the shared client and `make -C jobs/seed-api check` validates the seed
without running it. The applications use MUI directly for their components and
own their theme configuration.
`make test-runtime` exercises the built web servers with disposable fixtures;
`make test-e2e` runs the backend identity suites in an isolated database.
`make test-images APP=admin IMAGE=<tag>` (or `APP=portal`) checks a built web
image. See [repository units](docs/architecture/units.md) and [contracts](docs/architecture/contracts.md).
