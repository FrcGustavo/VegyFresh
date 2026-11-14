# VegyFresh architecture

The repository groups independently understandable units by responsibility. Rules inherit from repository to layer to unit. User instructions take precedence.

| Layer | Responsibility |
| --- | --- |
| apps | Interactive applications and their server entrypoints |
| services | Persistent system capabilities |
| clients | Reusable service clients and generated contracts |
| packages | Reusable runtime code with public exports |
| jobs | Finite executable processes |
| infrastructure | Shared deployment resources |
| docs | Cross-unit architecture and operations documentation |

Units own their source, tests, dependencies, configuration, Dockerfiles and commands. Do not add empty speculative units. Shared code requires real consumers. Dependencies flow through public exports; packages must not import applications.

Keep pnpm workspace package names stable when moving units. Makefiles expose commands; pnpm owns dependencies and orders workspace tasks inside Docker. Regenerate pnpm-lock.yaml with pnpm after manifest changes. Never edit lockfiles manually.

Inspect working-tree changes before editing and preserve unrelated work. Do not commit, push or deploy unless explicitly requested. Never read or publish local secrets as part of documentation. Keep authorization and organization/client isolation authoritative in the API.

Run the affected units' lint, type checks, meaningful tests and builds. Run integration checks when contracts or runtime boundaries change. Report checks that could not run. Comments explain non-obvious reasons, not code narration.
