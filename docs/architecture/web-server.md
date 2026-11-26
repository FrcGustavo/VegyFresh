# Web servers, sessions and SSR

The administrator and customer portal each run a TanStack Start/Nitro server. Native `/session` and `/api` routes delegate to their application-specific BFF. See the [contract overview](contracts.md), [administrator README](../../apps/frontend/README.md) and [portal README](../../apps/portal/README.md) for commands and configuration.

## HTTP boundary

| Endpoint                       | Contract                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `GET /health`                  | Process readiness without external service calls; not proof of dependency health. |
| `GET /session`                 | Public authentication state and local profile, without provider tokens.           |
| `GET /session/login`           | Starts an OIDC transaction with a constrained local `returnTo`.                   |
| `GET /session/register`        | Starts the protected OIDC registration transaction.                               |
| `GET /session/callback`        | Validates the transaction, code exchange, ID token and local profile.             |
| `POST /session/logout`         | Requires the configured origin, clears the session and returns a redirect target. |
| `GET /session/logout/redirect` | Completes provider logout with a short-lived server-protected hint.               |
| `/api/v1/*`                    | Application-specific route and method allowlist; API authorization still applies. |

Browsers send same-origin HttpOnly cookies. The BFF ignores browser Authorization and blocks retired credential routes. Mutations require the canonical origin. Private HTML, session and API responses must not enter shared caches. The two applications use separate cookie namespaces and must use independent session secrets.

The proxies handle protected cookie rotation and coalesced refresh, preserve sessions during provider outages, and reject invalid identity/profile states. Keep their size limits, redirect validation and error handling intact when changing routes. Do not copy older proxy variants from a local snapshot.

## Rendering and hydration

Administrator loaders preload orders, purchases, products, price lists, inventory, clients, suppliers, users and organization data through the current request's BFF. Portal order loaders do the same for list and detail. The API decides which records each identity can access.

Session and query caches belong to a request and identity, never a module-global authenticated singleton. Loader keys and browser query keys share pagination and ordering defaults. Propagate refreshed cookies to the outgoing response, but never serialize those cookies, access tokens or refresh tokens into HTML or loader payloads.

Failed preloads may retry after hydration; that fallback must not display another identity's cached records. Reset state on identity or organization changes. Dates and first-render preferences must agree between server and browser; browser storage is restored after hydration.

## Configuration and operation

Set `VEGYFRESH_PUBLIC_ORIGIN`, `VEGYFRESH_API_URL`, `OIDC_ISSUER`, `OIDC_API_AUDIENCE`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and `VEGYFRESH_SESSION_SECRET` in the server environment. The administrator server also needs `OIDC_PROVISIONING_SECRET`, shared with the API, for explicitly provisioning new administrator accounts. See the [OIDC setup guide](authentication.md).

The public origin is canonical and requires HTTPS outside loopback. The session key must contain at least 32 bytes of high-entropy material. Follow each unit's `.env.example` and README for listener and container-facing addresses. Register the application's external `/session/callback` with its OIDC client.

Use unit Makefiles for development and production image commands. Run root `make test-runtime` for built-server OIDC and API fixtures and CI image smoke checks for packaging. Run the [Auth0 development acceptance checks](authentication.md#development-verification) with the actual tenant and database.
