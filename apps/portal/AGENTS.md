# Customer portal

Read repository and `apps/AGENTS.md` guidance first. Follow `README.md` for Docker commands and server configuration.

Keep domain rules and application ports independent of React, transport and storage. Infrastructure owns authentication, API calls and query integration; presentation owns native TanStack routes and interaction. Use the existing shared UI package through its public exports, building workspace dependencies before the portal.

The API authorizes client and organization access. Do not provision portal identities from browser input or link identities by email. Tokens belong only in the server BFF; browser requests use same-origin cookies and never add Authorization.

Order loaders use the request's session and propagate refreshed cookies. Do not share authenticated state across requests or serialize cookies or tokens into route data. Preserve cancellation and HTTP error semantics in the single orders transport. Render delivery dates deterministically across time zones.

Keep `/error` messages constrained to supported public states; never echo arbitrary OIDC error details into HTML. Dashboard metrics remain placeholders until a separately authorized data integration supplies them.

Run `make -C apps/portal lint check-types test build`. After session, route or SSR changes run the root `make test-runtime` against the built server. Preserve concurrent-session, cookie rotation, allowlist and cross-origin regression tests. Fixture checks do not replace deployment validation with the real identity provider, API and database.
