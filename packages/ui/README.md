# Shared UI

`@vegyfresh/ui` exports themes, tokens and reusable presentation primitives to
the administrator, portal and catalogue. It does not own API or identity state.

From the repository root, `make -C packages/ui check` runs lint, type checking,
SSR-oriented component tests and the package build in the workspace tooling
container. The public package entrypoint resolves to the generated `dist` output;
the tooling entrypoint builds it before dependent applications run.
