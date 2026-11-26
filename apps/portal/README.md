# Customer portal

The portal runs on TanStack Start and Nitro. Its server owns the OIDC provider
session and proxies the allowlisted portal API. Browser requests use same-origin
HttpOnly cookies; the API determines client and organization access.

Build the portal with `pnpm --dir apps/portal run build`. Run `pnpm --dir apps/portal run start` to serve
the built `.output` directory, or `pnpm --dir apps/portal run dev` for development.
These commands run in Docker. To build the production image from the repository
root, use `docker build -f apps/portal/Dockerfile -t vegyfresh-portal .`.

Configure the runtime with:

- `VEGYFRESH_PUBLIC_ORIGIN`: the canonical external portal origin, with no path;
  HTTPS is required in production except on loopback.
- `VEGYFRESH_API_URL`: server-accessible API origin.
- `OIDC_ISSUER`: public realm issuer URL, matching the issuer in tokens.
- `OIDC_INTERNAL_URL`: optional server-accessible issuer URL when different.
- `OIDC_CLIENT_ID`: confidential portal application client ID.
- `OIDC_CLIENT_SECRET`: required confidential-client secret.
- `OIDC_API_AUDIENCE`: API audience requested from the provider at authorization.
- `OIDC_SIGNUP_HINT`: optional signup screen hint (`signup` by default; set empty to omit).
- `VEGYFRESH_SESSION_SECRET`: server-only secret for session transactions.
- `PORT` and `HOST`: listen address, defaulting to 5174 and the runtime default.

Register the external `/session/callback` URL with the OIDC provider portal client.
Provision portal identities in the API; the portal does not create clients or
manage their passwords. Legacy login and password setup URLs redirect to the
sign-in page. The dashboard metrics are placeholders. Order list and detail
pages render API-authorized data on the server using the request’s session. If
the initial order request fails, the browser retries through the BFF after
hydration. The browser transport never sends bearer tokens and preserves HTTP
errors and request cancellation. Delivery dates use UTC for consistent server
and browser rendering.
Responses are private and never cacheable.

`pnpm --dir apps/portal run lint`, `check-types`, `test`, and `build` validate the
unit. `pnpm --dir apps/portal run test:start` exercises the built server against
disposable identity and API fixtures. It does not replace an end-to-end check
with the real identity provider, API, database, and browser.

Copy `.env.example` to `.env` in this directory and configure the session secret
and identity provider. `make dev` starts the app-owned Docker Compose stack,
`make down` stops it, and `make check` runs checks. The Compose service reads
OIDC provider credentials and the session secret from `.env`. It defaults to the API
at `host.docker.internal:3000` and OIDC provider at `host.docker.internal:8080`;
set `DEV_API_URL` and `DEV_OIDC_INTERNAL_URL` in the shell to override
those container-facing URLs. Set `PORTAL_PORT` for the host port and
`DEV_PUBLIC_ORIGIN` for the browser-facing origin if needed. `make docker-build`
builds the production image, and `make start` runs it with the same `.env`.
