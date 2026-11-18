# Workspace tooling

The root Makefile runs JavaScript and TypeScript checks in a Node 24 container with pnpm 10.11, and delegates synchronizer validation to its own Makefile and .NET 10 SDK container. Docker and Docker Compose are required; host Node and .NET are not needed. `make install` prepares the pnpm dependencies, including the optional synchronizer reference.

- `make lint` runs Node unit lint/type validation and synchronizer .NET format verification.
- `make check-types` runs Node type checks and compiles the synchronizer CLI in Release mode.
- `make test` runs Node unit tests and synchronizer tests using simulated Microsip and HTTP fixtures.
- `make build` builds Node units and the .NET synchronizer CLI in Release mode.
- `make check` runs lint, type checks, tests and builds for Node units and the .NET synchronizer, stopping on failure.
- `make contract` checks the API client contract separately.

The Compose project stores unit dependency directories in named volumes. Run one tooling command at a time to avoid concurrent writes. Unit development and database commands remain in their respective documentation and Makefiles.

To change a dependency in a unit, run pnpm from this service targeting the unit directory, for example:

```sh
docker compose --project-name vegyfresh-tools -f infrastructure/tooling/compose.yml run --build --rm tools pnpm --dir apps/frontend add <package>
```

Commit the unit manifest and its pnpm-generated `pnpm-lock.yaml` together.

Unit Makefiles use the same container and volumes. For example, run
`make -C clients/api-client check contract` or
`make -C jobs/seed-api check`. See each unit's README for generation and seed
inputs.

`make -C services/microsip-sync check` uses a separate .NET 10 SDK container to
validate the synchronizer with simulated Microsip and HTTP fixtures. The
TypeScript reference is excluded from default validation; run
`make -C services/microsip-sync reference-check` separately for its lint, type
checks, tests and build. Tooling and the standalone synchronizer Compose share the `vegyfresh-microsip-locks` volume for exclusive company locks.

The tooling container resolves `host.docker.internal` to the host gateway for
local services. A job must still be explicitly configured with its target URL
and credentials; running validation does not run the seed.

To smoke-test a built web image, run `make test-images APP=admin IMAGE=<tag>`
or set `APP=portal`. The image driver has access to the Docker socket to start
an isolated application container and a disposable API fixture. It selects
application routes from `APP`, not from the image tag.

The root Docker context excludes `services/microsip-sync/*.local.json`, covering
`sync.local.json`. Example configurations remain
included. This exclusion does not affect the tooling container’s repository bind mount.
