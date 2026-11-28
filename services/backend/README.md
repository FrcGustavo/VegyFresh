# VegyFresh Backend

NestJS API for VegyFresh with OIDC authentication and tenant-scoped access control.

## API Docs (Swagger)

- URL: `/api/docs`
- Includes auth, tenant context, and endpoint tags.
- Bearer token auth is required for protected endpoints.

Export the current API contract with `pnpm --dir services/backend run export:openapi`.
This writes `clients/api-client/openapi.json` using local entity metadata and
isolated dummy configuration; it does not connect to a database. Run
`pnpm --dir services/backend run export:openapi --check` to detect a stale snapshot.
Pass `--output <path>` to use a different output file.

## Auth + Tenant Behavior

### Authentication and tenant context

Protected requests use RFC 9068 RS256 user access tokens with an `at+jwt` or `application/at+jwt` header. The API checks the exact configured issuer, JWKS, audience, and the client ID for the admin or portal application. The API validates the token and
resolves its issuer and subject to a local user or portal client. Authorization,
roles, permissions, and organization context come from the local records.
Existing users and portal clients must be linked explicitly; an email match does
not link an identity. The BFF can create a new organization-less admin owner
after its OIDC callback using `POST /auth/provision-admin` with the user access
token, `x-provisioning-secret`, and a body containing `issuer`, `subject`,
`email`, `emailVerified: true`, and optional `name`. The issuer and subject must
match the token. A verified profile cannot claim an existing local email.

- `GET /auth/me` returns the current user, organization, and role context.
- `GET /portal/auth/me` returns the linked portal client profile.

The API does not expose local signup, login, refresh, or logout endpoints.

## Identity mappings

A new verified admin subject with a valid profile can receive a local owner
profile without an organization. The API never links an existing profile by
email. A portal subject requires an explicit client mapping whose client belongs
to an organization. Mappings use the exact issuer, subject and identity type;
roles and organization access remain local to the API.

After reviewing the target record and applying the identity migration, an
operator may create a mapping with placeholders replaced by the verified
OIDC subject and the intended local UUID:

```sql
INSERT INTO external_identities (issuer, subject, identity_type, user_id)
VALUES ('<ISSUER>', '<SUBJECT>', 'user', '<USER_UUID>');

INSERT INTO external_identities (issuer, subject, identity_type, client_id)
VALUES ('<ISSUER>', '<SUBJECT>', 'portal-client', '<CLIENT_UUID>');
```

Use the statement for the intended identity type only. The database enforces
the mapping type and uniqueness constraints. Review the target environment and
record before applying any migration or mapping.

## Secure Defaults


## Local Docker commands

Copy `.env.example` to `.env` and configure the local environment. From the
repository root, `make -C services/backend dev` starts PostgreSQL, runs pending
migrations, and serves the API on `127.0.0.1:3000`. Configure `OIDC_ISSUER`, `OIDC_JWKS_URI`,
`OIDC_API_AUDIENCE`, `OIDC_ADMIN_CLIENT_ID`, `OIDC_PORTAL_CLIENT_ID`, and
`OIDC_PROVISIONING_SECRET` (at least 32 bytes). The issuer and JWKS URI must be
HTTPS except for loopback development. Run
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
