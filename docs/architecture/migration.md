# Migration implementation and closeout

## Integrated structure

The [unit inventory](units.md) describes the current workspace. The Nest API lives in `services/backend`, while `apps/frontend` and `apps/portal` own their TanStack Start entrypoints, routes and BFFs. `clients/api-client` owns the checked-in OpenAPI contract and generated types; `jobs/seed-api` is a finite API client process. Package names remain stable across moves.

The web applications use native TanStack routes. Their initial authorized data is loaded on the server: nine administrator resource views and the portal order list and detail. Browser queries hydrate from that identity-scoped state and retry failed preloads through the same-origin BFF. Keycloak replaces local password authentication; the API still resolves identities, permissions and organization/client scope.

Domain and application code are separated from presentation and infrastructure. Transport, persistence and React Query integration belong to infrastructure. Each unit owns its Makefile, `package.json` and `pnpm-lock.yaml`; shared Docker tooling runs pnpm unit tasks. No application should need a legacy `apps/backend` compatibility path, SPA entrypoint or Turbo pipeline.

## Reconcile historical snapshots

A local migration snapshot is not an authoritative replacement for the merged implementation. Several migration PRs corrected security, SSR hydration, cookie renewal, contracts and runtime boundaries while the snapshot remained unchanged. Compare each local path with the merged code before transferring it.

Preserve these invariants when reconciling:

- JWT issuer/subject mapping and API authorization remain authoritative; email never links identities automatically.
- Incomplete profiles fail closed, and identity or organization changes clear the old query scope.
- Tokens stay server-side, response caches are private, and proxies preserve application allowlists, body limits and mutation-origin checks.
- SSR output is deterministic; browser preferences load after hydration.
- PostgreSQL identity and isolation suites remain enabled. A passing reduced test command is not equivalent to the original suites.

Keep unused helpers and alternate implementations out of runtime wiring unless an actual consumer needs them. Do not import an old lockfile: reconcile manifests, then regenerate with pnpm.

## Verification and completion

Run the root `make check`, `make contract`, `make test-runtime` and `make test-e2e` commands as applicable. [Workspace tooling](../../infrastructure/tooling/README.md) and unit READMEs define their prerequisites. CI also builds and smoke-tests the application and API images.

These checks have distinct scopes. Contract checks detect generated drift. Disposable OIDC/API fixtures validate protocol, SSR and session behavior. PostgreSQL suites exercise API identity and isolation. Image smoke checks validate packaging and HTTP boundaries. None alone proves a deployed environment works.

A final deployment check must use the actual configured Keycloak realm, PostgreSQL, API and both applications, including a browser. Verify two concurrent identities, organization/client isolation, initial HTML data, hydration, renewal and logout. Record the exact revision and which checks ran; do not carry a historical test result forward as evidence for changed code.

Merging the PR series does not itself deploy services, migrate an existing database, configure external identity mappings or resolve retained local changes. Account for each retained path as integrated, replaced, pending or intentionally excluded before declaring the migration closed.
