# Customer portal

The portal runs on TanStack Start and Nitro. Its server owns the Keycloak
session and proxies the allowlisted portal API. Browser requests use same-origin
HttpOnly cookies; the API determines client and organization access.

Build the workspace dependencies and portal with `pnpm --filter @vegyfresh/ui
build && pnpm --filter portal build`. Run `pnpm --filter portal start` to serve
the built `.output` directory, or `pnpm --filter portal dev` for development.
These commands run in Docker. To build the production image from the repository
root, use `docker build -f apps/portal/Dockerfile -t vegyfresh-portal .`.

Configure the runtime with:

- `VEGYFRESH_PUBLIC_ORIGIN`: the canonical external portal origin, with no path;
  HTTPS is required in production except on loopback.
- `VEGYFRESH_API_URL`: server-accessible API origin.
- `KEYCLOAK_ISSUER`: public realm issuer URL, matching the issuer in tokens.
- `KEYCLOAK_INTERNAL_URL`: optional server-accessible issuer URL when different.
- `KEYCLOAK_CLIENT_ID`: defaults to `vegyfresh-portal`.
- `KEYCLOAK_CLIENT_SECRET`: optional confidential-client secret.
- `VEGYFRESH_SESSION_SECRET`: server-only secret for session transactions.
- `PORT` and `HOST`: listen address, defaulting to 5174 and the runtime default.

Register the external `/session/callback` URL with the Keycloak portal client.
Provision portal identities in the API; the portal does not create clients or
manage their passwords. Legacy login and password setup URLs redirect to the
sign-in page. The dashboard metrics are placeholders. Order list and detail
pages render a loading state on the server and retrieve data after hydration.

`pnpm --filter portal lint`, `check-types`, `test`, and `build` validate the
unit. `pnpm --filter portal test:start` exercises the built server against
disposable identity and API fixtures. It does not replace an end-to-end check
with the real identity provider, API, database, and browser.
