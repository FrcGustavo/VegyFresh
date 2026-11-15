# Workspace tooling

The root Makefile runs checks in a Node 24 container with pnpm 10.11. Docker and Docker Compose are required; host Node is not needed for these commands. `make install` prepares dependencies for each unit, and `make lint`, `make check-types`, `make test`, `make build`, `make check`, and `make contract` run the corresponding tasks across all units. The entrypoint installs each unit's frozen lockfile and builds `@vegyfresh/ui` first for its consumers.

The Compose project stores unit dependency directories in named volumes. Run one tooling command at a time to avoid concurrent writes. Unit development and database commands remain in their respective documentation and Makefiles.

To change a dependency in a unit, run pnpm from this service targeting the unit directory, for example:

```sh
docker compose --project-name vegyfresh-tools -f infrastructure/tooling/compose.yml run --build --rm tools pnpm --dir apps/frontend add <package>
```

Commit the unit manifest and its pnpm-generated `pnpm-lock.yaml` together.

Unit Makefiles use the same container and volumes. For example, run
`make -C clients/api-client check contract`, `make -C jobs/seed-api check`,
`make -C packages/ui check` or `make -C apps/docs check`. The catalogue dev
server is available at `http://localhost:5175` through
`make -C apps/docs dev`. See each unit's README for generation and seed inputs.

The tooling container resolves `host.docker.internal` to the host gateway for
local services. A job must still be explicitly configured with its target URL
and credentials; running validation does not run the seed.

To smoke-test a built web image, run `make test-images APP=admin IMAGE=<tag>`
or set `APP=portal`. The image driver has access to the Docker socket to start
an isolated application container and a disposable API fixture. It selects
application routes from `APP`, not from the image tag.
