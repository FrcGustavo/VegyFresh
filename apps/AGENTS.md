# apps

Applications own their entrypoints, routing and composition. Domain and application code must not depend on React, HTTP, storage or infrastructure. Infrastructure implements application ports; presentation composes screens and consumes data hooks. Keep per-request SSR state isolated and retain API authorization as authoritative.

The administrator and customer portal use TanStack Start with native server routes. Keycloak owns credential entry; server-side BFFs own tokens. Browser calls use same-origin cookies. Never serialize credentials into loader data or share an authenticated query cache between requests.
