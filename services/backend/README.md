# VegyFresh Backend

NestJS API for VegyFresh with Keycloak authentication and tenant-scoped access control.

## API Docs (Swagger)

- URL: `/api/docs`
- Includes auth, tenant context, and endpoint tags.
- Bearer token auth is required for protected endpoints.

Export the current API contract with `pnpm --filter backend export:openapi`.
This writes `clients/api-client/openapi.json` using local entity metadata and
isolated dummy configuration; it does not connect to a database. Run
`pnpm --filter backend export:openapi --check` to detect a stale snapshot.
Pass `--output <path>` to use a different output file.

## Auth + Tenant Behavior

### Authentication and tenant context

Protected requests use Keycloak access tokens. The API validates the token and
resolves its issuer and subject to a local user or portal client. Authorization,
roles, permissions, and organization context come from the local records.
Existing users and portal clients must be linked explicitly; an email match does
not link an identity. A new admin identity can provision an organization-less
owner when its profile is valid and the owner role is configured.

- `GET /auth/me` returns the current user, organization, and role context.
- `GET /portal/auth/me` returns the linked portal client profile.

The API does not expose local signup, login, refresh, or logout endpoints.

## Secure Defaults

- `BCRYPT_SALT_ROUNDS` defaults to `12` (minimum accepted: `10`) for local user password administration.

## Local Docker commands

Copy `.env.example` to `.env` and configure the local environment. From the
repository root, `make -C services/backend dev` starts PostgreSQL, runs pending
migrations, and serves the API on `127.0.0.1:3000`. Keycloak must be started
separately; its browser-facing issuer remains `http://localhost:8080`, while
containers fetch its JWKS through `host.docker.internal`. Run
`make -C services/backend down` to stop the stack without deleting its database
volume. `make -C services/backend compose-config ENV_FILE="$PWD/services/backend/.env.example"`
validates the Compose configuration without starting containers.

`make -C services/backend test-e2e` runs the identity and tenant integration
suites against an isolated PostgreSQL Compose project and removes its temporary
volume afterward. Unit checks and the production image use Docker as well:

```bash
make -C services/backend lint check-types test build
make -C services/backend docker-build
```

## WhatsApp Webhook Integration

The WhatsApp webhook creates orders on behalf of a bot user inside a specific tenant organization.
Two environment variables control this:

```
WHATSAPP_ORGANIZATION_ID=<uuid>   # The target organization that receives webhook orders
WHATSAPP_BOT_USER_ID=<uuid>       # The user assigned as the order owner for every webhook order
```

**Prerequisite:** The bot user (`WHATSAPP_BOT_USER_ID`) must belong to the target organization
(`WHATSAPP_ORGANIZATION_ID`) via `users.organization_id`. Without this, the `findUserOrFail`
check in `OrdersService` will throw a `NotFoundException` for every incoming webhook order.

To provision this, update the user organization directly:

```sql
UPDATE users
SET organization_id = '<WHATSAPP_ORGANIZATION_ID>'
WHERE id = '<WHATSAPP_BOT_USER_ID>';
```
