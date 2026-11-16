# jobs/seed-api

This finite TypeScript job uses `@vegyfresh/api-client`. `make check` validates it without writing data. `make run` writes to the configured API and requires an explicit bearer token or local Keycloak credentials and target selection. Keep password-grant authentication limited to the development realm; do not run it against a shared environment without authorization.
