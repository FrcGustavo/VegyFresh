# Local Keycloak

This unit owns a development Keycloak Compose service and the VegyFresh realm definition. Use make up, down and logs. The realm contains public Authorization Code clients requiring PKCE S256, the API audience mapper and explicit scopes for admin and portal. The admin client also enables password grants only for the local seed job. Never add real users or production secrets to the realm export. Development credentials and start-dev are restricted to local development. Identity mappings belong to the backend database and require explicit issuer/subject/type provisioning.
