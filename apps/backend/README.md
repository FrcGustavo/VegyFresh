# VegyFresh Backend

NestJS API for VegyFresh with JWT auth and tenant-scoped access control.

## API Docs (Swagger)

- URL: `/api/docs`
- Includes auth, tenant context, and endpoint tags.
- Bearer token auth is required for protected endpoints.

## Auth + Tenant Behavior

### Token model

- Access and refresh tokens include:
  - `sub` (user id)
  - `org_id` (tenant organization id)
  - `role` (user role name)
  - `permissions` (role permissions)
  - `session_id` / `sid` (session id)
- Tenant scoping is resolved from these claims; requests are evaluated inside the authenticated `org_id`.

### Auth endpoints

- `POST /auth/signup`
  - Creates organization + owner user in one transaction.
- `POST /auth/login`
  - Accepts `email` and `password`.
  - User organization and role are loaded directly from `users.organization_id` and `users.role_id`.
- `POST /auth/refresh`
  - Requires `refresh_token`.
  - Session must be active, unrevoked, and tied to the same organization.
- `GET /auth/me`
  - Returns current user, organization, and role context.
- `POST /auth/logout`
  - Revokes current session.
- `POST /auth/logout-all`
  - Revokes all user sessions in current tenant.

## Input Hardening

- Auth DTOs use `class-validator` constraints.
- Auth routes enforce `ValidationPipe` with:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `forbidUnknownValues: true`
  - `transform: true`

## Secure Defaults

- `BCRYPT_SALT_ROUNDS` defaults to `12` (minimum accepted: `10`).
- `JWT_ACCESS_TTL` defaults to `15m` (must remain in safe bounds).
- `JWT_REFRESH_TTL` defaults to `7d` (must remain in safe bounds).
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (or `JWT_SECRET` fallback) must be at least 32 characters.

## Local scripts

```bash
pnpm --filter backend run build
pnpm --filter backend run test
pnpm --filter backend run dev
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
