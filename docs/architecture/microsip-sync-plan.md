# Plan de sincronización con Microsip

La [referencia TypeScript](../../services/microsip-sync/README.md) lee los
pedidos de WhatsApp mediante la API, desde una fecha UTC explícita. Conserva
el historial en SQLite y permite probar la recuperación con un simulador.

VegyFresh sigue siendo la autoridad para acceso a la organización y lectura
de pedidos. El sincronizador mantiene localmente las correspondencias de
cliente y unidad, y usa el folio exacto del producto como clave externa. Los
precios se determinarán en Microsip. El resultado queda en el historial local.

Para el piloto se requiere una instalación de Windows con licencia y acceso
autorizado a una empresa de prueba. Queda por comprobar la validación de
catálogos, la aplicación de precios y la conciliación tras una interrupción.
