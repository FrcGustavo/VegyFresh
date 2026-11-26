# Administrator application

Read the repository and `apps/AGENTS.md` guidance first. Unit commands and environment settings are documented in `README.md`.

## Ownership and dependencies

- `src/domain` contains rules and data shapes independent of React, HTTP and storage.
- `src/application` contains use cases and ports; it may depend on domain code.
- `src/infrastructure` implements transport, authentication, persistence and React Query adapters. It must not import presentation.
- `src/presentation` owns native TanStack routes, screens, form interaction and composition. Consume server state through infrastructure adapters, not direct transport or React Query imports.

Use MUI components directly from `@mui/material` in presentation code. Keep app-specific loading behavior and theme styling in the frontend. Do not add wrappers that only re-export or lightly restyle a MUI component, and do not add generic hooks merely to reserve an architectural boundary.

## SSR and identity

Preserve request-local session and query state. Initial route loaders and browser queries must use the same query keys, pagination defaults and identity scope. When identity or organization changes, invalidate the previous state before displaying the new scope.

Keep profile validation fail-closed and organization permissions authoritative in the API. Do not revive password endpoints, browser token storage or bearer forwarding. Use the existing BFF transport and server session adapters.

Render deterministic dates and default preferences on the server and first client render. Restore browser-only preferences after hydration. Do not read localStorage in an initializer that changes the first rendered markup.

## Validation

Use the unit Makefile for Docker commands: `make -C apps/frontend lint check-types test build`. Lint includes architecture checks. After server or route changes, build and run `make test-runtime` from the repository root. These tests use disposable OIDC/API fixtures; report separately whether real OIDC provider, PostgreSQL, API and browser validation ran.

Regenerate the unit `pnpm-lock.yaml` with pnpm after dependency changes. Do not weaken TypeScript or architecture rules to accommodate an unused abstraction.
