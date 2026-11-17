# Plan de sincronización con Microsip

Estado: sincronizador local implementado con simulador persistente. La conexión real a Microsip y el piloto siguen pendientes de los requisitos del cliente. El único desarrollo de este plan es el sincronizador.

## Implementación disponible

La unidad [services/microsip-sync](../../services/microsip-sync/README.md) consulta la API existente, pagina los pedidos, vuelve a revisar aprobaciones y valida relaciones, folios, cantidades y unidades. Por defecto selecciona pedidos de WhatsApp aprobados desde una fecha UTC obligatoria.

Conserva historial y transiciones en SQLite, guarda la intención antes de enviar, concilia interrupciones y deja los resultados inciertos para revisión manual. Incluye bloqueo por empresa, reintentos limitados, comandos de historial/resolución y un simulador que conserva los folios después de reiniciar. No se modificaron aplicaciones ni contratos de API de VegyFresh.

El motor operativo ahora usa C#/.NET 10 y adaptadores internos `simulator` y
`microsip`. TypeScript se conserva como referencia. El puente Windows x86
serializa llamadas a la DLL en procesos independientes, conserva la referencia
completa en la descripción y solicita políticas Microsip con precio/descuento
`-1` por renglón. Las correspondencias numéricas requieren verificación local.

El [diagnóstico x86](../../services/microsip-sync/diagnostic/README.md) sigue
independiente. La publicación autocontenida se verifica por compilación e
inspección PE, sin ejecutar Windows ni certificar la DLL. No se instala Windows
en la Mac y no se han ejecutado pedidos productivos.

La verificación portable usa HTTP y SQLite temporales, un simulador persistente,
interrupciones de procesos y una interfaz nativa falsa. Se comprueba continuidad
de archivos SQLite con TypeScript. Los resultados y límites están en
[VERIFICATION.md](../../services/microsip-sync/VERIFICATION.md).

## Validación real pendiente

Se requiere Windows, licencia y empresa de prueba para comprobar conexión,
catálogos, unidades de venta, almacén/sucursal, precios y descuentos. La búsqueda
por referencia no está acreditada: `lookup` devuelve `unknown`. El subconjunto
usado obtiene el ID interno, pero no un folio verificado; incluso una aplicación
exitosa queda en revisión hasta comprobar el folio y ejecutar `resolve`.
Nunca se reenvía automáticamente una escritura real de resultado incierto.

## Alcance acordado

- El cliente pide por WhatsApp. Puede escribir `tomate 5` o `5 tomate`.
- VegyFresh identifica los productos y guarda las cantidades.
- El catálogo se captura a mano en VegyFresh, con base en Microsip.
- El folio del producto debe coincidir con su clave en Microsip. El UUID es interno.
- El sincronizador se instala junto a Microsip. Consulta VegyFresh por pedidos pendientes.
- Registra los pedidos en Microsip y guarda el resultado en su propio historial local.
- Microsip determina los precios según la lista del cliente.
- El sincronizador usa productos y cantidades. Los importes existentes en VegyFresh no determinan el precio en Microsip.
- El objetivo del flujo es capturar el pedido sin cotizar al cliente por WhatsApp.
- Se usa la captura actual de WhatsApp, el catálogo y la API existentes.
- No se modifica VegyFresh. Tampoco se agregan pantallas, campos, estados o rutas de API.
- El portal, la facturación y la sincronización de inventario quedan fuera del alcance.

## Punto de partida

El código de WhatsApp ya interpreta mensajes y crea pedidos pendientes de revisión.
La API actual permite consultar pedidos con su cliente, productos y cantidades.
Los productos y clientes ya tienen folio y UUID.
El sincronizador utiliza esos datos tal como se entregan hoy.
Esta revisión fue del código; no se probó el flujo con WhatsApp o Microsip reales.

## Pasos de trabajo

1. **Configurar el acceso.** Usar la autenticación actual de VegyFresh con acceso a la organización correspondiente.
   Configurar la empresa y el almacén de Microsip en el sincronizador.
2. **Consultar pedidos.** Leer periódicamente todas las páginas necesarias de la API actual.
   Seleccionar los pedidos de WhatsApp que cumplan la regla acordada y aún no estén registrados.
   Volver a consultar pedidos anteriores para detectar aprobaciones posteriores.
3. **Relacionar los datos.** Usar el folio del producto como clave en Microsip.
   Comprobar unidades y cantidades. Resolver la relación del cliente en la configuración local.
   Detener el registro si falta una coincidencia.
4. **Registrar en Microsip.** Usar su mecanismo de integración soportado.
   Dejar que Microsip determine precios, descuentos e impuestos.
5. **Guardar el resultado localmente.** Conservar el identificador del pedido de VegyFresh,
   el folio de Microsip, la fecha y cualquier error. Consultar ese historial antes de registrar otro pedido.
6. **Resolver interrupciones.** Retomar el trabajo después de un corte de internet o reinicio.
   Si no se sabe si Microsip guardó el pedido, comprobarlo antes de repetirlo.
   Si no puede comprobarse, dejarlo para revisión manual.
   Ejecutar una sola instancia por empresa para evitar registros simultáneos.
7. **Probar y hacer un piloto.** Usar una instalación de prueba y después un cliente.
   Confirmar productos, cantidades, unidades, precios y folios antes de ampliar el uso.

## Qué necesitamos del cliente

- Versión exacta de Microsip y módulos contratados.
- Acceso al mecanismo de integración y sus condiciones de uso.
- Acceso autorizado a VegyFresh mediante su autenticación actual.
- Una computadora disponible para ejecutar el sincronizador.
- Un cliente y algunos productos de ejemplo con sus claves y unidades.
- Una copia autorizada para pruebas, cuando esté disponible.

## Puntos por confirmar

- Si solo se sincronizarán pedidos aprobados. Es la propuesta inicial.
- Desde qué fecha se tomarán pedidos para evitar importar el historial completo.
- Cómo identificar al cliente en Microsip. No asumir que ambos folios ya coinciden.
- En qué empresa, sucursal y almacén se registrarán los pedidos.
- Si la integración permite registrar el pedido y aplicar la lista del cliente sin enviar precios.
- Cómo localizar en Microsip un pedido ya registrado tras una interrupción.
- Cómo consultar el historial local y quién atenderá los errores.
- Cómo tratar cambios o cancelaciones después de sincronizar. Para el piloto, se propone resolverlos en Microsip.

El control local evita repetir el mismo identificador de pedido de VegyFresh.
Dos pedidos distintos creados por mensajes repetidos requieren revisión; el sincronizador no cambia la captura de WhatsApp.
Los resultados se consultarán en el sincronizador. No se devolverán a VegyFresh en este alcance.
La conexión real y la aplicación de precios quedan pendientes de probar con Microsip.
