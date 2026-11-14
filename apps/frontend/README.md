# VegyFresh administrator

The administrator runs on TanStack Start and Nitro. Its server owns the
Keycloak session and proxies allowlisted API routes. Browser requests use
same-origin HttpOnly cookies; the API determines organization and role access.
Administrative screen data loads in the browser after hydration. API resources and
their browser transport live in `src/infrastructure/api`; legacy SPA session
adapters live in `src/infrastructure/auth` during the migration.

Run `pnpm --filter frontend dev` for development, `pnpm --filter frontend build`
to build, and `pnpm --filter frontend start` to serve the resulting `.output`
directory. These commands run with Node 24 in Docker. The legacy SPA build is
available temporarily as `pnpm --filter frontend build:spa`. Build the production
image from the repository root with:

```sh
docker build -f apps/frontend/Dockerfile -t vegyfresh-frontend .
```

Provide the following server environment variables at runtime (including in
CapRover); export them before starting development. See `.env.example` for
local variable names. Do not put secrets in `VITE_` variables or the browser
bundle:

- `VEGYFRESH_PUBLIC_ORIGIN`: canonical external administrator origin without a
  path; HTTPS is required except on loopback.
- `VEGYFRESH_API_URL`: server-accessible backend origin, default
  `http://localhost:3000`.
- `KEYCLOAK_ISSUER`: public realm issuer URL matching tokens.
- `KEYCLOAK_INTERNAL_URL`: optional server-accessible issuer URL when different.
- `KEYCLOAK_CLIENT_ID`: defaults to `vegyfresh-admin`.
- `KEYCLOAK_CLIENT_SECRET`: optional confidential-client secret.
- `VEGYFRESH_SESSION_SECRET`: server-only high-entropy key of at least 32 bytes.
- `PORT` and `HOST`: listener settings; the production image defaults to port 80.

Register the external `/session/callback` URL with the Keycloak administrator
client. Login and registration redirect to Keycloak. The server encrypts tokens
in HttpOnly cookies and projects only the public profile to the page. The old
`API_URL` and `VITE_API_URL` settings configure the legacy SPA and do not
configure this server. `API_SCHEMA_URL` (or `VITE_API_URL_JSON`) supplies the
OpenAPI document URL when regenerating API types.

Run `pnpm --filter frontend lint`, `check-types`, `test`, and `build` for unit
validation. `pnpm --filter frontend test:start` exercises the built server
against disposable identity and API fixtures; it does not replace a check with
real Keycloak, the API, database and browser.

Copy `.env.example` to `.env` in this directory and configure the session secret
and identity provider. `make dev` starts the app-owned Docker Compose stack,
`make down` stops it, and `make check` runs checks. The Compose service reads
Keycloak credentials and the session secret from `.env`. It defaults to the API
at `host.docker.internal:3000` and Keycloak at `host.docker.internal:8080`;
set `DEV_API_URL` and `DEV_KEYCLOAK_INTERNAL_URL` in the shell to override
those container-facing URLs. Set `FRONTEND_PORT` for the host port and
`DEV_PUBLIC_ORIGIN` for the browser-facing origin if needed. `make docker-build`
builds the production image, and `make start` runs it with the same `.env`.
For `make start`, configure `VEGYFRESH_API_URL` and `KEYCLOAK_INTERNAL_URL` in
`.env` with addresses reachable from the container (for local host services,
use `host.docker.internal`); the public issuer and origin remain browser-facing.
The `/health` endpoint returns an uncached status response.

### Frontend layer checks

`pnpm --filter frontend lint` verifies that domain and application code stays
independent of browser APIs and infrastructure, and that presentation uses
infrastructure adapters for server state. Run `pnpm --filter frontend
check:architecture` to run that check separately. Order, price-list and
purchase draft rules are tested without a browser; their query and mutation
adapters keep cache behavior in the infrastructure layer.
