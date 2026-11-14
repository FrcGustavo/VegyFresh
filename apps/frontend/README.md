# VegyFresh Frontend

React, TypeScript, Vite, Material UI, and TanStack Query app for the VegyFresh monorepo.

## Scripts

Run commands from the monorepo root:

```bash
pnpm --filter frontend dev
pnpm --filter frontend check-types
pnpm --filter frontend lint
pnpm --filter frontend test
pnpm --filter frontend build
pnpm --filter frontend preview
```

If pnpm needs to fetch packages in a restricted environment, the local binaries under `apps/frontend/node_modules/.bin` can still be used for quick verification.

## Environment

Copy the example for local development:

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```

`VITE_API_URL` must be an absolute HTTP(S) URL and include the backend prefix
`/api/v1`. Development falls back to `http://localhost:3000/api/v1`. During
compilation, Vite writes its value to `dist/config.js`, or `/api/v1` when it is
omitted.

Vite supports a file per mode when a developer needs explicit environment profiles:

```text
.env.development
.env.staging
.env.production
```

Run a staging build with `pnpm --filter frontend build --mode staging`. Do not commit credentials in these files.

The Docker image replaces `config.js` when the container starts. Configure the
backend URL with `API_URL`:

```bash
docker run -e API_URL=https://api.example.com/api/v1 vegyfresh-frontend
```

In CapRover, add `API_URL` under **App Configs > Environmental Variables**. The
variable is required when the container starts, but it is not needed while
CapRover builds the image.

`API_SCHEMA_URL` (or the compatible `VITE_API_URL_JSON`) must contain the complete OpenAPI document URL used by the type generator, for example `https://example.com/api/docs-json`.

## Project Notes

- Feature code lives in `src/modules`.
- Shared UI primitives live in `src/components`.
- Shared hooks live in `src/hooks`.
- API calls should use the public `src/infrastructure/api` exports. Typed resource clients live in `src/infrastructure/api/resources.ts`; `src/api/index.ts` remains a compatibility barrel for existing consumers.
- Regenerate the OpenAPI contract types from `VITE_API_URL_JSON` with `pnpm --filter frontend generate:api-types`.
- Server state is managed with TanStack Query.
- Material UI theme setup lives in `src/App.tsx`.

## Validation

Before opening a PR, run:

```bash
pnpm --filter frontend check-types
pnpm --filter frontend lint
pnpm --filter frontend test
pnpm --filter frontend build
```

The production build is route-split with `React.lazy`. Keep route-level chunks intact when adding new top-level pages.

## Dependency Audit

Run dependency audits from the workspace and confirm whether findings affect frontend runtime dependencies:

```bash
pnpm audit --prod
```

Previous review found a moderate `qs` advisory through the backend dependency path, not through frontend runtime code.

## Parallel Start runtime

The default development and production commands still use the SPA. A parallel TanStack Start runtime provides the native session and allowlisted API routes, plus a small server-rendered session page while the administrative screens are migrated. It is not the production entrypoint yet.

For this runtime set `VEGYFRESH_PUBLIC_ORIGIN` to its canonical public origin (HTTPS except loopback), `VEGYFRESH_API_URL` to the backend origin, `KEYCLOAK_ISSUER` and `VEGYFRESH_SESSION_SECRET` to the server-side identity settings. Optional `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, and `KEYCLOAK_INTERNAL_URL` configure the provider. Keep these values server-side.

```bash
pnpm --filter frontend dev:start
pnpm --filter frontend build:start
pnpm --filter frontend serve:start
pnpm --filter frontend test:start # requires build:start
```

Start creates session projections per request; the BFF keeps provider tokens in encrypted HttpOnly cookies and applies its existing API allowlist. The HTTP integration test uses disposable identity and API fixtures.
