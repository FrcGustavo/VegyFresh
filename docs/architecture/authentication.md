# OpenID Connect and OAuth 2.0

VegyFresh uses OpenID Connect for sign-in and OAuth 2.0 access tokens for API
requests. The admin and portal servers discover the issuer's endpoints and use
Authorization Code with PKCE S256, state and nonce. The API accepts signed RSA
SHA-256 access tokens following [RFC 9068](https://www.rfc-editor.org/rfc/rfc9068),
for its configured audience and the client ID allowed on each route. VegyFresh
stores application identities and permissions in PostgreSQL. The ID token
identifies the user to the web server. The access token authorizes the API call.

## Configure Auth0 for development

1. Create a development tenant and two confidential **Regular Web Applications**,
   one for admin and one for the portal. Enable the intended connections and
   Authorization Code and Refresh Token. Set the token endpoint authentication
   method to Client Secret (Post). Leave password and client-credentials grants
   disabled for these web applications.
2. Register a custom API with an identifier unique to VegyFresh. Select RS256
   and the RFC 9068 access token profile. Enable Allow Offline Access for the
   API, then enable refresh token rotation with finite inactivity and maximum
   lifetimes on both web applications. Use OIDC RP-initiated logout when
   advertised as `end_session_endpoint`. See the [Auth0 token profile guide](https://auth0.com/docs/secure/tokens/access-tokens/access-token-profiles)
   and [refresh rotation settings](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation).
3. Register the exact development URLs. Adjust both the URLs and the root
   Compose origins together if using different ports.

   | Application | Allowed callback URL | Allowed logout URL |
   | --- | --- | --- |
   | Admin | `http://localhost:5173/session/callback` | `http://localhost:5173/` |
   | Portal | `http://localhost:5174/session/callback` | `http://localhost:5174/` |

4. Copy `.env.example` to `.env` in the repository root. Paste the issuer and
   JWKS URI published in the tenant's discovery document, preserving the exact
   issuer including its trailing slash. Enter the API identifier and the two
   application registrations. Generate two independent session keys and a
   separate provisioning secret with `openssl rand -hex 32`. The provisioning
   secret is shared by the admin server and API. Keep the configuration in
   the server environment. Run `make up`.

## Test accounts

Sign up through the admin application and verify the email address at the
provider. The admin callback can provision a new local owner without an
organization. Complete the organization's onboarding before running the
[seed job](../../jobs/seed-api/README.md) or testing organization data.
Supply an OAuth access token issued to the admin client for that development
user. A development OAuth client can obtain it through an interactive
Authorization Code with PKCE flow using a registered development callback.
Use the same admin client ID that the API checks. The browser session uses
encrypted cookies and the web server keeps the access token private.

Create a portal test account in the development tenant, then create a local
customer through the admin application or seed job. In the development
database, use the exact Auth0 User ID from the account as the `subject` and the
local customer UUID as `client_id`. For example, use the following statement in
`psql` after setting the three variables to your test values.

```sql
INSERT INTO external_identities (issuer, subject, identity_type, client_id)
VALUES (:'oidc_issuer', :'oidc_subject', 'portal-client', :'client_id'::uuid);
```

Use a local customer that belongs to the organization under test. The link
allows portal access for that customer and is independent of their email address.

## Provider requirements

A compatible provider supplies OIDC discovery, confidential Authorization Code
with PKCE, standard profile claims and RFC 9068 access tokens for the API. The
web authorization request defaults to the Auth0 `audience` and
`screen_hint=signup` parameters. Set `OIDC_API_RESOURCE_PARAMETER=resource`
for a provider that takes a [resource indicator](https://www.rfc-editor.org/rfc/rfc8707).
Set `OIDC_SIGNUP_HINT=` for a provider that uses the same entry point for sign-in
and sign-up. Application identities are keyed by issuer and subject, with
separate bindings for administrator and customer accounts. New test providers
can use fresh account bindings.

## Development verification

- Sign in, sign up, verify email, reset a password and sign out in the browser.
  Confirm the local session ends and Auth0 logout completes when advertised.
- Check that an unlinked portal account is rejected and that a linked account
  can only see orders for its local customer. Use two organizations and test
  that a token issued to one web app fails on routes for the other app.
- Wait for access token expiry and make overlapping requests from the same
  session. Verify refresh rotation and repeat with the intended replica count.
- Run the seed against development. If testing Microsip catalog import, supply
  a development API token with `catalog:manage` in the relevant organization.
- Run `make test-runtime`, `make test-e2e` and `make contract` for automated
  checks. The browser steps above exercise the real provider and database.
