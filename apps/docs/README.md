# UI catalogue

This Vite application demonstrates `@vegyfresh/ui` exports and both light and
dark themes. From the repository root, run:

```sh
make -C apps/docs check
make -C apps/docs dev
make -C apps/docs down
make -C apps/docs docker-build
```

The development catalogue listens on `http://localhost:5175` (override with
`DOCS_PORT`). `make -C apps/docs dev` starts the app-owned Docker Compose
service, which installs frozen workspace dependencies and builds `@vegyfresh/ui`
before starting Vite. When running `make dev` or `make up` from the repository
root, this service runs as part of the unified `vegyfresh` Compose project.
