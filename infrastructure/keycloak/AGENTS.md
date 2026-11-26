# Local Keycloak

This unit retains the former development Keycloak Compose service and realm. The default stack uses Auth0. The realm contains the original public Authorization Code clients, API audience mapper and application scopes. Never add real users or production secrets to the realm export. Development credentials and start-dev are restricted to local development. Identity mappings belong to the backend database and require explicit issuer/subject/type provisioning.
