# Seed API

Genera datos deterministas mediante `@vegyfresh/api-client`. El proceso es
idempotente: una segunda ejecución actualiza catálogos desalineados y no duplica
compras ni pedidos.

## Ejecución local

```bash
cp jobs/seed-api/.env.example jobs/seed-api/.env
# Configura SEED_API_BASE_URL y SEED_API_BEARER_TOKEN en jobs/seed-api/.env.
make -C jobs/seed-api run
```

`SEED_API_BEARER_TOKEN` es obligatorio. Proporciona un access token de desarrollo
emitido para la API por Auth0, perteneciente a un usuario vinculado a la
organización de destino y autorizado para administrar usuarios, catálogo,
inventario y pedidos. El proceso no renueva el token: si expira durante la
ejecución, obtén uno nuevo y vuelve a ejecutar el seed. La operación es
idempotente.

El archivo `.env` está ignorado por Git. `SEED_API_BASE_URL` del ejemplo usa una
dirección accesible desde el contenedor de herramientas. Para ejecutar
`pnpm run seed` directamente en el host, cambia `host.docker.internal` por
`localhost`.

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

El seed crea perfiles de negocio, no cuentas de Auth0. Para iniciar sesión en el
portal con un perfil generado, crea o usa una cuenta Auth0 de desarrollo y
vincula su identidad a ese perfil dentro de la organización correspondiente.
El correo coincidente por sí solo no establece el vínculo.
