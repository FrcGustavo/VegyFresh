# Seed API

Genera datos deterministas mediante `@vegyfresh/api-client`. El proceso es
idempotente: una segunda ejecución actualiza catálogos desalineados y no duplica
compras ni pedidos.

## Ejecución local

```bash
cp jobs/seed-api/.env.example jobs/seed-api/.env
# Configura las credenciales del usuario local de Keycloak en jobs/seed-api/.env.
make -C infrastructure/keycloak up
make -C jobs/seed-api run
```

El seed obtiene un access token de Keycloak mediante el flujo de contraseña del
cliente `vegyfresh-admin`, y renueva el token durante la ejecución. Usa un usuario
local de Keycloak vinculado a la organización de destino y con permisos de
usuarios, catálogo, inventario y pedidos. El realm de desarrollo habilita este
flujo solo para ejecutar el seed localmente; no lo habilites en la configuración
de producción. `SEED_API_BEARER_TOKEN` puede usarse como alternativa manual.

El archivo `.env` está ignorado por Git. Las variables `SEED_KEYCLOAK_TOKEN_URL`
y `SEED_API_BASE_URL` del ejemplo usan direcciones accesibles desde el contenedor
de herramientas. Para ejecutar `pnpm run seed` directamente en el host, cambia
`host.docker.internal` por `localhost`.

Variables opcionales:

- `SEED_ADMIN_PASSWORD`: contraseña del administrador generado.
- `SEED_OPERATOR_PASSWORD`: contraseña de los cuatro operativos.
- `SEED_CONCURRENCY`: concurrencia para recursos de catálogo; por defecto `10`.
- `SEED_TRANSACTIONAL_CONCURRENCY`: concurrencia para compras y pedidos; por defecto `3`.

Si el realm local ya existía antes de habilitar el flujo en el archivo de realm,
activa **Direct Access Grants** en el cliente `vegyfresh-admin` desde la consola
local de Keycloak. Keycloak solo importa el realm automáticamente cuando aún no
existe en el volumen persistente.

## Comandos

```bash
make -C jobs/seed-api check
```

La implementación separa configuración, dominio, generadores puros, acceso al
API, servicios por agregado y utilerías. Las pruebas usan un API en memoria para
validar relaciones y ejecutar el flujo dos veces.

El seed crea perfiles de negocio, no cuentas de Keycloak. Para iniciar sesión,
los usuarios y clientes existentes requieren un vínculo de identidad explícito.
