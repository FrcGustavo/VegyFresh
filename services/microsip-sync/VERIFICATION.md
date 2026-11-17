# Verificación de la migración .NET

La verificación previa a la división en PRs se ejecutó el 17 de noviembre de
2026 desde una Mac ARM64, usando contenedores Linux con SDK .NET 10.

| Comprobación | Resultado y alcance |
| --- | --- |
| `make check` | Formato del motor, CLI, pruebas y puente; compilación con advertencias como errores; 49 pruebas aprobadas; build sin advertencias ni errores |
| `make reference-check` | Lint, tipos, pruebas y build de la referencia TypeScript aprobados dentro del tooling Docker |
| Compatibilidad SQLite | Las clases TypeScript originales generaron historial v1 con intención `submitting` y recibo simulado. .NET abrió ambos archivos y concilió a `synced` conservando `SIM-00000001`; TypeScript releyó la transición y recibo. Solo fixtures temporales |
| `make publish-windows` | Publicación autocontenida de CLI, NativeHost y diagnóstico; `file` identificó los tres `.exe` como PE32 Intel 80386 |
| Imagen Docker .NET | Construida desde fuentes sin copiar binarios locales; ejecución `once` sin token terminó con código 1 antes de enviar una petición a la API |
| Compose | `docker compose -f services/microsip-sync/compose.yml config --quiet` aprobado |
| Cambios | `git diff --check` aprobado durante esta verificación local |

Durante la división en PRs se repitieron las comprobaciones de la referencia
TypeScript y del motor portable. En el PR portable pasaron las 39 pruebas de
`make check` y las 40 pruebas con el fixture SQLite entre ambos runtimes. Se
repitieron la validación de Compose y la compilación de la imagen .NET. La
ejecución de `once` sin token salió con código 1. En el PR del puente Windows
se repitió `make check`: 49 pruebas aprobadas, formato y build sin errores.
`make publish-windows` produjo los tres ejecutables; `file` identificó cada
uno como PE32 Intel 80386. Compose y `git diff --check` también aprobaron.
No se ejecutó Windows ni una DLL real. La contención simultánea del bloqueo
entre procesos TypeScript y .NET y la parada ordenada por SIGTERM no se probaron.

Las pruebas portables cubren cantidades y relaciones, aislamiento, elegibilidad
y aprobaciones posteriores, paginación/envelopes/orden/repeticiones, tokens
rotativos, refresco previo, intención durable, eventos inmutables, reintentos,
folios simulados persistentes, bloqueo entre procesos y liberación al morir,
reinicio antes y después de commit simulado, pérdida de respuesta, recibos
inválidos, interrupción con confirmación tardía y CLI contra HTTP local.

La interfaz nativa falsa comprueba conexión, selección de base de Ventas,
encabezado con referencia completa y `PLHandle=-1`, renglones con precio y
descuento `-1`, aplicación, orden de llamadas, aborto y limpieza ante fallos.
También comprueba que validar no escriba y que correspondencias incompletas o
sin evidencia local se rechacen. Estas pruebas no cargan una DLL real.

Los fuentes usados para contrastar declaraciones fueron los Pascal y el manual
Ventas del paquete API 2026 disponible localmente. No se distribuyen la DLL ni
credenciales. Microsoft.Data.Sqlite 10.0.12 y SQLitePCLRaw.bundle_e_sqlite3 3.0.5
se restauraron sin advertencias de vulnerabilidad; no se deshabilitó la auditoría.

## Pendiente en Windows y empresa de prueba

- Comportamiento del tiempo límite del worker cuando Windows bloquea la entrada
  estándar o deja abiertos los canales de salida.
- Carga de DLL/dependencias, conexión, versión compatible y licencia.
- Correspondencias de clientes, folios, IDs, unidad de venta, almacén y sucursal.
- Validaciones comerciales, stock, precios, descuentos e impuestos reales.
- Obtención fiable de folio y búsqueda por referencia después de interrupciones.

El puente conserva `lookup=unknown`. Incluso después de una aplicación exitosa,
solo se obtiene un ID interno; no se inventa un folio. El motor deja el pedido
en revisión hasta que un operador compruebe el documento y registre su folio.
La publicación x86 no constituye certificación ni autorización de producción.
