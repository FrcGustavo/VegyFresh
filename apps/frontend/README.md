# VegyFresh administrator

The administrator runs on TanStack Start and Nitro. Its server owns the
OIDC provider session and proxies allowlisted API routes. Browser requests use
same-origin HttpOnly cookies; the API determines organization and role access.
The initial orders, clients, suppliers, products, price lists, users, purchases,
inventory, and organization views load through the request-local BFF during SSR.
Authorized data hydrates an identity-scoped query cache; failed preloads retry in
the browser. API resources and browser transport live in `src/infrastructure/api`;
session adapters live in `src/infrastructure/auth`.

Run `pnpm --dir apps/frontend run dev` for development, `pnpm --dir apps/frontend run build`
to build, and `pnpm --dir apps/frontend run start` to serve the resulting `.output`
directory. These commands run with Node 24 in Docker. Build the production
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
- `OIDC_ISSUER`: public issuer URL matching tokens.
- `OIDC_INTERNAL_URL`: optional server-accessible issuer URL when different.
- `OIDC_CLIENT_ID`: confidential administrator application client ID.
- `OIDC_CLIENT_SECRET`: required confidential-client secret.
- `OIDC_API_AUDIENCE`: API audience requested from the provider at authorization.
- `OIDC_SIGNUP_HINT`: optional signup screen hint (`signup` by default; set empty to omit).
- `OIDC_PROVISIONING_SECRET`: separate shared API secret of at least 32 bytes for verified admin provisioning.
- `VEGYFRESH_SESSION_SECRET`: server-only high-entropy key of at least 32 bytes.
- `PORT` and `HOST`: listener settings; the production image defaults to port 80.

Register the external `/session/callback` URL with the OIDC provider administrator
client. Login and registration redirect to OIDC provider. The server encrypts tokens
in HttpOnly cookies and projects only the public profile to the page. `API_SCHEMA_URL` (or `VITE_API_URL_JSON`) supplies the
OpenAPI document URL when regenerating API types.

Run `pnpm --dir apps/frontend run lint`, `check-types`, `test`, and `build` for unit
validation. `pnpm --dir apps/frontend run test:start` exercises the built server
against disposable identity and API fixtures; it does not replace a check with
real OIDC provider, the API, database and browser.

Copy `.env.example` to `.env` in this directory and configure the session secret
and identity provider. `make dev` starts the app-owned Docker Compose stack,
`make down` stops it, and `make check` runs checks. The Compose service reads
OIDC provider credentials and the session secret from `.env`. Set
`DEV_API_URL` to override the default API URL `http://host.docker.internal:3000`.
For Auth0, set `OIDC_ISSUER` to the tenant issuer and leave `OIDC_INTERNAL_URL`
empty. Set `FRONTEND_PORT` for the host port and
`DEV_PUBLIC_ORIGIN` for the browser-facing origin if needed. `make docker-build`
builds the production image, and `make start` runs it with the same `.env`.
For `make start`, configure `VEGYFRESH_API_URL` and `OIDC_INTERNAL_URL` in
`.env` with addresses reachable from the container (for local host services,
use `host.docker.internal`); the public issuer and origin remain browser-facing.
The `/health` endpoint returns an uncached status response.

### Frontend layer checks

`pnpm --dir apps/frontend run lint` verifies that domain and application code stays
independent of browser APIs and infrastructure, and that presentation uses
infrastructure adapters for server state. Run `pnpm --dir apps/frontend run
check:architecture` to run that check separately. Order, price-list and
purchase draft rules are tested without a browser; their query and mutation
adapters keep cache behavior in the infrastructure layer.
