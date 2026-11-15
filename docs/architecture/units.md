# Repository units

VegyFresh groups independently maintained code by responsibility. Each unit
owns its dependencies (`package.json` and `pnpm-lock.yaml`), tests and commands,
consuming shared packages through explicit relative links and public exports.

| Unit | Role |
| --- | --- |
| `apps/frontend` | Administrator application and server entrypoint |
| `apps/portal` | Customer portal and separate server session |
| `apps/docs` | Catalogue of shared UI primitives |
| `services/backend` | Nest API, persistence and migrations |
| `clients/api-client` | Shared client and generated OpenAPI contract |
| `jobs/seed-api` | Finite API seed job |
| `packages/ui` | Reusable UI primitives and theme tokens |
| `infrastructure/keycloak` | Local development realm and identity provider |

Applications use domain, application, infrastructure and presentation areas.
Dependencies flow through public package exports; packages do not depend on apps.
The API remains authoritative for permissions and organization/customer scope.
See [workspace tooling](../../infrastructure/tooling/README.md) and the unit
READMEs for commands and environment requirements.
