# Referencia TypeScript de sincronización con Microsip

La referencia lee pedidos de WhatsApp aprobados con el cliente de la API de VegyFresh.
Registra los intentos en SQLite y usa un simulador persistente de Microsip.

Ejecuta `make -C services/microsip-sync check` desde la raíz para validar el código.
Copia `config.example.json` como `sync.local.json` y adapta los identificadores,
las asignaciones y la URL para el entorno de pruebas. El contenedor de herramientas
accede a servicios del host por medio de `host.docker.internal`.
