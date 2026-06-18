# VegyFresh Monorepo

VegyFresh is a Turborepo-based monorepo with:
- **Backend API** (NestJS + TypeORM + PostgreSQL)
- **Admin web app** (React + Vite + MUI)
- **Customer portal** (React + Vite + MUI)

## Workspace structure

- `apps/backend` — main API (`/api/v1`) with Swagger docs at `/api/docs`
- `apps/frontend` — internal/admin application
- `apps/portal` — customer portal application
- `scripts/seed-api` — database/API seed script

## Backend modules (current)

Main modules in `apps/backend/src/app.module.ts`:
- Auth, Organizations, Users, Roles
- Catalog (products, price lists, product prices)
- Clients, Suppliers, Orders
- **Inventory** and **Purchase** (separated modules)
- Portal (customer auth + portal orders)
- AI + WhatsApp integrations

## Auth and session flow (current)

- JWT access + refresh tokens for admin and portal.
- Admin auth endpoints under `/auth` include:
  - `POST /auth/signup`
  - `POST /auth/login`
  - `GET /auth/me`
  - `POST /auth/refresh`
  - `POST /auth/logout`
- Portal auth endpoints under `/portal/auth` include:
  - `POST /portal/auth/login`
  - `POST /portal/auth/refresh`
  - `GET /portal/auth/me`
  - `POST /portal/auth/logout`
- Frontend session restore uses tokens in localStorage and bootstraps user context with `/auth/me`.
- If an authenticated user visits `/login`, frontend redirects to `/orders`.

## Requirements

- Node.js `>=20.19.0`
- pnpm `10.11.0` (via Corepack)
- PostgreSQL

## Quick start

1. Install dependencies:

```bash
corepack enable
corepack prepare pnpm@10.11.0 --activate
pnpm install
```

2. Configure backend environment:

```bash
cp apps/backend/.env.example apps/backend/.env
```

3. (Optional) configure frontend/portal `VITE_API_URL` to your backend base URL (including `/api/v1`).

4. Run all apps in dev mode:

```bash
pnpm dev
```

## Common commands

From repository root:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm check-types
```

Targeted commands:

```bash
pnpm --filter backend dev
pnpm --filter backend build
pnpm --filter backend test

pnpm --filter frontend dev
pnpm --filter frontend build
pnpm --filter frontend test

pnpm --filter portal dev
pnpm --filter portal build
pnpm --filter portal test
```

Run seed script:

```bash
pnpm seed:api
```

## API docs

When backend is running:
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`

## Docker (backend)

Build and run backend container using `Dockerfile.backend`. It compiles/deploys the backend app and starts `dist/main` with `PORT=80`.
