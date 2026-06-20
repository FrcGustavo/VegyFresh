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
`/api/v1`. Development falls back to `http://localhost:3000/api/v1` when it is
omitted, but production builds require it. During compilation, Vite writes the
literal value to `dist/config.js`.

Vite supports a file per mode when a developer needs explicit environment profiles:

```text
.env.development
.env.staging
.env.production
```

Run a staging build with `pnpm --filter frontend build --mode staging`. Do not commit credentials in these files.

Docker can read `apps/frontend/.env` during the build. The URL can also be
provided explicitly as a build argument:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com/api/v1 \
  -f Dockerfile.frontend \
  -t vegyfresh-frontend .
```

The generated `config.js` is included unchanged in the Nginx image, so each
backend URL requires its own frontend build.

`API_SCHEMA_URL` (or the compatible `VITE_API_URL_JSON`) must contain the complete OpenAPI document URL used by the type generator, for example `https://example.com/api/docs-json`.

## Project Notes

- Feature code lives in `src/modules`.
- Shared UI primitives live in `src/components`.
- Shared hooks live in `src/hooks`.
- API calls should go through `src/api/index.ts`. Typed resource clients live in `src/api/resources.ts`.
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
