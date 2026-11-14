# Seed API

Genera datos deterministas mediante `@vegyfresh/api-client`. El proceso es
idempotente: una segunda ejecución actualiza catálogos desalineados y no duplica
compras ni pedidos.

## Ejecución

```bash
SEED_API_BASE_URL=http://host.docker.internal:3000/api/v1 \
SEED_API_BEARER_TOKEN=<token> \
make -C jobs/seed-api run
```

El token debe pertenecer a la organización que recibirá los datos y contar con
permisos de usuarios, catálogo, inventario y pedidos.

Variables opcionales:

- `SEED_ADMIN_PASSWORD`: contraseña del administrador generado.
- `SEED_OPERATOR_PASSWORD`: contraseña de los cuatro operativos.
- `SEED_CONCURRENCY`: concurrencia para recursos de catálogo; por defecto `10`.
- `SEED_TRANSACTIONAL_CONCURRENCY`: concurrencia para compras y pedidos; por defecto `3`.

## Comandos

```bash
make -C jobs/seed-api check
```

La implementación separa configuración, dominio, generadores puros, acceso al
API, servicios por agregado y utilerías. Las pruebas usan un API en memoria para
validar relaciones y ejecutar el flujo dos veces.

El seed crea perfiles de negocio, no cuentas de Keycloak. Para iniciar sesión,
los usuarios y clientes existentes requieren un vínculo de identidad explícito.
