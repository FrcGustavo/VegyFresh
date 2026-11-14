# apps

Applications own their entrypoints, routing and composition. Domain and application code must not depend on React, HTTP, storage or infrastructure. Infrastructure implements application ports; presentation composes screens and consumes data hooks. Keep per-request SSR state isolated and retain API authorization as authoritative.
