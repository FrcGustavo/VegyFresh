# Repository units

VegyFresh groups independently maintained code by responsibility. Each unit
owns its dependencies (`package.json` and `pnpm-lock.yaml`), tests and commands,
consuming shared packages through explicit relative links and public exports.

| Unit | Role |
| --- | --- |
| `apps/frontend` | Administrator application and server entrypoint |
| `apps/portal` | Customer portal and separate server session |
| `services/backend` | Nest API, persistence and migrations |
| `services/microsip-sync` | Portable .NET 10 WhatsApp order synchronization, SQLite recovery, simulator and separate Windows x86 Microsip bridge |
| `clients/api-client` | Shared client and generated OpenAPI contract |
| `jobs/seed-api` | Finite API seed job |

Applications use domain, application, infrastructure and presentation areas.
The applications use MUI directly for presentation and theme configuration.
The API remains authoritative for permissions and organization/customer scope.
See [workspace tooling](../../infrastructure/tooling/README.md) and the unit
READMEs for commands and environment requirements.
