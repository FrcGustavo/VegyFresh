# Local Keycloak development realm

This unit defines a local-only Keycloak 26.8.1 service and the `vegyfresh`
realm. It is preparatory infrastructure: it does not change the existing
applications' authentication or provision application accounts.

Run commands from the repository root:

```bash
make -C infrastructure/keycloak check
make -C infrastructure/keycloak up
make -C infrastructure/keycloak logs
make -C infrastructure/keycloak down
```

`check` validates the Compose configuration and realm definition using Docker.
The service imports the realm on startup with `--import-realm`. Importing only
creates a realm that does not already exist; edits to the export do not update
an existing realm in the persistent `keycloak_data` volume. See Keycloak's
[import documentation](https://www.keycloak.org/server/importExport).

The Admin Console is available at <http://localhost:8080/admin/>. For local
development only, the bootstrap username defaults to `admin` and the password
to `vegyfresh-local-dev-only`. Override them with
`KC_BOOTSTRAP_ADMIN_USERNAME` and `KC_BOOTSTRAP_ADMIN_PASSWORD` in the shell
before startup. Do not use these example credentials, `start-dev`, or this
Compose file in production. The public issuer defaults to
`http://localhost:8080` and can be changed with `KEYCLOAK_PUBLIC_ORIGIN`.

The realm defines two public OpenID Connect clients:

| Client | Local redirect origin | Optional scopes |
| --- | --- | --- |
| `vegyfresh-admin` | `http://localhost:5173` | `vegyfresh-api` |
| `vegyfresh-portal` | `http://localhost:5174` | `vegyfresh-api`, `vegyfresh-portal` |

Both use Authorization Code flow with PKCE S256 and disable implicit flow and
direct password grants. The `basic`, `profile`, and `email` scopes are enabled
by default; `basic` includes the subject in access tokens. The optional
`vegyfresh-api` scope adds that audience to access tokens, while
`vegyfresh-portal` is a scope marker. The export enables registration and
password recovery, but contains no application users, client secrets, or
application roles. A Keycloak identity alone does not grant application access;
authorization and identity mapping must be handled by the application API.
