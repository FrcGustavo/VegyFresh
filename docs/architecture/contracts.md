# Web and API contracts

The backend exports a checked-in OpenAPI document from application metadata.
The API client generates TypeScript types from that document; both are checked
for drift by `make contract`. This detects metadata and generated type drift,
not deployment configuration or all runtime behavior. See the [API client
commands](../../clients/api-client/README.md) and [backend
operations](../../services/backend/README.md).

The administrator and portal own separate TanStack Start server routes and
session cookies. Their server-side proxies apply application-specific route
allowlists and forward authorized requests to the API. The API verifies identity
and resolves local permissions and organization scope. An existing profile is
never linked merely by matching email. [Keycloak setup](../../infrastructure/keycloak/README.md)
describes the local realm and identity mapping prerequisites.

`make test-runtime` runs the built servers with disposable identity and API
fixtures, checking session isolation and proxy behavior. It does not provision
an external identity provider or test a deployed database. `make test-e2e` runs
the backend identity integration suites against a separate temporary database.
