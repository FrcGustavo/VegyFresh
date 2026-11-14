# Workspace tooling

The root Makefile runs checks in a Node 24 container with pnpm 10.11. Docker and Docker Compose are required; host Node is not needed for these commands. `make install` prepares dependencies, and `make lint`, `make check-types`, `make test`, `make build`, `make check`, and `make contract` run the corresponding workspace tasks. pnpm runs package tasks in dependency order; the entrypoint first builds the shared UI used by consumers.

The Compose project stores dependency directories in named volumes. Run one tooling command at a time to avoid concurrent writes. Unit development and database commands remain in their respective documentation and Makefiles.

To change a dependency, run pnpm from this service, for example:

```sh
docker compose --project-name vegyfresh-tools -f infrastructure/tooling/compose.yml run --build --rm tools pnpm --filter frontend add <package>
```

Commit the manifest and pnpm-generated lockfile together.
