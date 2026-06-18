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

Create a local env file when the API is not running on the default local URL:

```bash
VITE_API_URL=http://localhost:3000
```

`VITE_API_URL` controls the base URL used by `src/api/index.ts`. When omitted, local development falls back to `http://localhost:3000`.

`VITE_API_URL_JSON` must contain the complete OpenAPI document URL used by the type generator, for example `https://example.com/api/docs-json`.

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
