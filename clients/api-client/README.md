# API client and contract

`@vegyfresh/api-client` is shared by the administrator, portal and API seed. It
exports generated contract types and a transport-independent client; callers
provide the request adapter. Multi-request workflows are not database
transactions. Authorization and tenant isolation remain the API's responsibility.

Run from the repository root using Docker:

```sh
make -C clients/api-client check
make -C clients/api-client contract
```

`contract` compares the checked-in OpenAPI snapshot with current backend
metadata and checks the generated TypeScript types. The metadata exporter uses
isolated configuration and does not connect to a database. To update both:

```sh
make -C clients/api-client export
make -C clients/api-client generate
make -C clients/api-client contract
```

Generation defaults to `openapi.json` in this unit. `API_SCHEMA_URL` (or the
legacy `VITE_API_URL_JSON`) can select a URL or a path accessible inside the
tooling container. Review the contract and generated changes together.
