# Sincronizador Microsip (.NET 10)

Servicio local de pedidos y aplicación de catálogos con interfaz gráfica separada. El motor portable consulta la API existente
de VegyFresh mediante HTTP, conserva SQLite e incluye un simulador persistente.
El proceso independiente `Microsip.NativeHost.exe` carga la DLL únicamente en
Windows x86. No requiere Node.js para operar. No instala Windows, máquinas
virtuales, servicios de sistema ni modifica una instalación Microsip.

El simulador es el modo predeterminado. **No se ha certificado Microsip real**:
faltan Windows, licencia y empresa de prueba autorizada. Los fuentes TypeScript
se conservan como referencia en `src/`; `make reference-check` ejecuta sus pruebas.
El flujo de pedidos no escribe estados ni pedidos en VegyFresh. La importación
de catálogos utiliza un endpoint autorizado de la API.

## Ejecución

Con Docker en la Mac:

```sh
make -C services/microsip-sync check
make -C services/microsip-sync run ARGS='once --config sync.local.json'
make -C services/microsip-sync run ARGS='run --config sync.local.json'
make -C services/microsip-sync run ARGS='history --config sync.local.json'
make -C services/microsip-sync publish-windows
```

Copiar `config.example.json` a `sync.local.json`. Todos sus identificadores son
ficticios. Las rutas son relativas al archivo de configuración. En Docker las
rutas deben existir dentro del contenedor. `run` mantiene ciclos seriales; `once`
ejecuta uno. `history` no necesita token, no crea archivos y puede consultar el
historial mientras opera el servicio. Su salida omite el payload del pedido.
Errores externos se reducen a causas de etapa para no guardar credenciales.

Con SDK .NET 10 local, desde esta unidad:

```sh
dotnet run --project dotnet/Cli/Microsip.Sync.csproj -- once --config sync.local.json
```

La publicación autocontenida queda en `artifacts/win-x86/`: `sync/`, `native/` y
`diagnostic/`, más `Microsip.Sync.Desktop-win-x86.zip`. Copiar cada directorio completo a Windows; no necesita .NET ni
Node.js instalados. Ejecutar `sync/Microsip.Sync.exe once --config RUTA_JSON`.
El diagnóstico sigue siendo independiente: [diagnostic/README.md](diagnostic/README.md).
La compilación cruzada no demuestra carga ni compatibilidad de la DLL.

## Importación de catálogos en Windows

Ejecutar `make -C services/microsip-sync publish-desktop-windows` y descomprimir
`artifacts/win-x86/Microsip.Sync.Desktop-win-x86.zip` en un directorio propio de
Windows x86. Abrir `Microsip.Sync.Desktop.exe`. La aplicación es autocontenida;
el ZIP no es un instalador. Los ejemplos incluidos son ficticios y no se deben
enviar a producción sin adaptar IDs y permisos.

Introducir la URL de la API terminada en `/api/v1`, el UUID de la organización,
una clave **estable** para la empresa Microsip y la ruta de un archivo local
privado con el token Bearer de VegyFresh. Guardar la configuración y seleccionar
un archivo JSON normalizado como [catalog-snapshot.example.json](catalog-snapshot.example.json).
La aplicación guarda solo la **ruta** del token bajo el perfil local de Windows;
nunca almacena su contenido en la configuración ni en el ZIP. La API valida la
autorización y el aislamiento de organización. El token debe contar con los
permisos de importación de catálogos para la organización indicada.
En concreto, requiere `catalog:manage`. Antes de usar la ventana, desplegar la
versión de backend con el endpoint de importación y ejecutar su migración de
identidades Microsip. La publicación cruzada produce un ejecutable Windows x86,
pero la operación con Microsip real y el flujo completo deben verificarse en
una máquina Windows x86 autorizada.

Al pulsar **Sincronizar**, la ventana solicita una vista previa y muestra para
productos, listas, precios y clientes las cantidades creadas, actualizadas y
sin cambios. La aplicación solicita confirmación explícita antes de aplicar.
La fecha y hora de la última aplicación exitosa se conservan entre arranques y
frente a errores. No se pueden iniciar dos importaciones a la vez. Si un envío
queda pendiente por una respuesta ambigua, volver a seleccionar **exactamente el
mismo archivo** y pulsar Sincronizar: se reintenta con la misma clave de
idempotencia. El estado local guarda solo hash del archivo y UUID de esa clave,
no una copia del catálogo. Mantener el archivo disponible hasta terminar.

El JSON de entrada tiene exactamente cuatro arreglos: `products`, `priceLists`,
`prices` y `clients`. Cada producto incluye `externalId`, `name`, `unit` (`kg` o
`pz`) y `supplierId` (UUID); `vegyfreshId` (UUID) es opcional. Cada lista incluye
`externalId`, `name` y opcionalmente `vegyfreshId`. Cada precio incluye
`productExternalId`, `priceListExternalId` y `price` como cadena decimal con
máximo dos decimales. Cada cliente incluye `externalId`, `name`, `phoneNumber`,
`priceListExternalId`, y opcionalmente `email` y `vegyfreshId`. Las referencias
de precio y cliente deben corresponder a entradas del mismo archivo. No incluir
`organizationId` ni `company`: la aplicación los añade desde la configuración.
El archivo no puede superar 2 MiB y cada arreglo admite como máximo 2,500
entradas. Una vinculación explícita mediante `vegyfreshId` debe corresponder a
la entidad esperada; revisar también el nombre de la lista, el proveedor y la
unidad cuando la API rechace la importación.

La extracción de datos crudos de Microsip, el mapeo de sus campos a este esquema
y la lectura directa desde una instalación real siguen **sin verificar**. Este
flujo consume un archivo ya normalizado; el operador debe preparar y revisar
las equivalencias de artículos, proveedores, unidades, listas y clientes. La
importación escribe únicamente los catálogos autorizados en VegyFresh; no
escribe existencias, pedidos ni estados de pedido.

`compose.yml` permite ejecutar continuamente el simulador Linux. Configurar
`dataDir` en `/data/simulator`, preparar `sync.local.json` y `api-token.local`, y
usar `docker compose -f services/microsip-sync/compose.yml up --build -d`.
El token montado como archivo puede requerir recrear el contenedor cuando se
renueve mediante reemplazo atómico; es preferible montar un directorio privado
de secretos gestionado. El adaptador Microsip se ejecuta nativamente en Windows.

## Configuración y contrato HTTP

| Campo | Regla |
| --- | --- |
| `apiBaseUrl` | URL HTTP(S) incluyendo `/api/v1`, sin credenciales, query ni fragmento |
| `organizationId` | UUID esperado; la autorización y el aislamiento siguen en la API |
| `company`, `branch`, `warehouse` | Destino local explícito |
| `since` | Corte inclusivo UTC ISO 8601 terminado en `Z` |
| `statuses` | Predeterminado `APPROVED`; opcional `PENDING_REVIEW` explícito |
| `clients` | UUID VegyFresh a clave local de cliente Microsip |
| `units` | Correspondencias de `kg` y `pz`; sin conversiones |
| `pageSize` | 1–1000 |
| `pollIntervalMs`, `retryDelayMs` | Enteros positivos; reintento exponencial limitado a 30 días |
| `maxAttempts` | 1–100 antes de revisión |
| `dataDir` | Historial exclusivo para organización, empresa y adaptador |
| `adapter` | `{"mode":"simulator"}` predeterminado; o configuración Microsip abajo |

Los campos de ruta, estados y correspondencias se cargan al iniciar; reiniciar
tras modificarlos. Se rechazan campos desconocidos y módulos JavaScript.
Proporcionar exactamente una fuente de access token existente:
`MICROSIP_SYNC_API_TOKEN` o `MICROSIP_SYNC_TOKEN_FILE`. El archivo se relee antes
de cada petición y admite renovación externa; el servicio no renueva tokens.
El usuario debe pertenecer a la organización y tener `orders:read`.
No versionar tokens, credenciales, correspondencias reales ni bases locales.
En Windows restringir sus ACL al usuario del servicio; en Unix se usan directorios
privados y permisos restrictivos para las bases principales.

Se conservan los contratos de `clients/api-client/src/generated/schema.ts`:
`GET /orders` con `created_filter=range`, `created_from`, `order_by=created_at`,
`order=asc`, `limit`, `offset`; `GET /orders/{id}` para refrescar antes del envío.
No se filtra por estado en la consulta: cada ciclo recorre desde el día de `since`
para detectar aprobaciones posteriores. Comprueba corte UTC exacto, organización,
orden estable por fecha/ID, páginas repetidas y duplicados. Solo selecciona
WhatsApp y estados configurados. Se rechazan redirecciones HTTP; timeout 15 s.

Cada relación cliente/producto debe corresponder al pedido y organización.
El **folio exacto**, sin recortar ni sustituir por UUID, identifica el producto.
Las cantidades positivas admiten tres decimales; piezas requieren enteros.
El payload no contiene precios, descuentos ni impuestos de VegyFresh.
La lectura y el registro externo no son una transacción conjunta: cambios o
cancelaciones posteriores requieren atención operativa en Microsip.

## Durabilidad y revisión

`history.sqlite` y `simulator.sqlite` mantienen el esquema v1 de TypeScript,
identificadores de aplicación, WAL y sincronización FULL. Cada transición del
historial se añade dentro de la misma transacción que actualiza el estado;
los eventos no pueden actualizarse ni borrarse. Hacer respaldos consistentes
con SQLite, incluyendo WAL; no borrar el historial para resolver errores.

| Estado | Comportamiento |
| --- | --- |
| `retry` | Fallo previo al envío o ausencia duradera acreditada; espera y límite |
| `submitting` | Intención guardada antes del envío; se concilia al reiniciar aunque la API ya no liste el pedido |
| `synced` | Recibo válido confirmado; no se reenvía |
| `review` | Resultado incierto o límite agotado; intervención manual |

La referencia completa es `vegyfresh:<organization UUID>:<order UUID>`.
Un recibo inválido o pérdida de respuesta exige conciliación. Solo una ausencia
que descarte confirmaciones futuras habilita reintento. Un timeout/interrupción
tras iniciar la escritura va a revisión incluso si una llamada sigue activa.
El simulador acredita sus propios folios `SIM-*`, nunca un pedido real.

Para resolver después de verificar manualmente el folio, detener el servicio:

```sh
make -C services/microsip-sync run ARGS='resolve UUID_PEDIDO FOLIO_REAL --config sync.local.json'
make -C services/microsip-sync run ARGS='retry UUID_PEDIDO --confirmed-absent --config sync.local.json'
```

`retry` requiere comprobar que no existe documento ni trabajo pendiente capaz
de registrarlo después; rechaza `submitting` hasta conciliarlo. Reinicia intentos
y deja una transición auditada. `resolve` registra el folio indicado por el
operador. Ninguna acción cambia VegyFresh.

El bloqueo por empresa mantiene `BEGIN IMMEDIATE` en una conexión SQLite
independiente; se libera al morir el proceso. Todas las instancias deben compartir
historial, identidad de empresa y `MICROSIP_SYNC_LOCK_DIR`. Por defecto usa el
mismo directorio temporal por UID que TypeScript en Unix. Docker comparte el
volumen `vegyfresh-microsip-locks`. No coordina equipos ni rutas distintas.
No ejecutar otra instalación para la misma empresa. Se impide cambiar de
organización, empresa o adaptador sobre el mismo historial.

## Adaptador Windows x86

Configurar en el archivo principal:

```json
{"mode":"microsip","hostPath":"./native/Microsip.NativeHost.exe","nativeConfigPath":"./native.local.json"}
```

Ese objeto reemplaza `adapter`. Preparar `native.local.json` desde
`native.example.json`. `customers` relaciona claves locales con IDs numéricos de
Microsip; `products` relaciona folios exactos con `articleId` y unidad verificada.
`warehouseId` debe pertenecer a la sucursal y empresa indicadas. No se asume que
ningún ID sea igual al UUID de VegyFresh. `catalogMappingsVerified` permanece
`false` hasta validar catálogos, unidad de venta y destino en la empresa de prueba.
No hay consulta automática de catálogos en este subconjunto documentado.
Una relación ausente o sin verificar rechaza la operación con causa explícita.

Las credenciales de conexión se suministran por `MICROSIP_DATABASE`,
`MICROSIP_USER`, `MICROSIP_PASSWORD`; no se guardan en JSON ni en el historial.
Cada solicitud usa un proceso Windows x86 separado y las llamadas se serializan.
El proceso tiene límite de 25 s y se termina al excederlo; el motor limita las
operaciones a 30 s. Una terminación no demuestra rollback del proveedor.

Las declaraciones utilizadas se contrastaron con `ApiMspBasicaExt.pas`,
`ApiMspVentasExt.pas` y el manual Ventas del paquete API 2026 (mayo 2026):
`stdcall`, ANSI estricto, enteros de 32 bits, `Double` y `PLHandle=-1` en
`NuevoPedido`. No se copia la declaración C# incompleta de ese paquete.
Se conecta, selecciona la base de Ventas, crea encabezado y renglones, aplica,
aborta ante fallo previo a aplicación y libera conexión/recursos en `finally`.
La descripción conserva la referencia completa. Cada renglón envía precio y
descuento `-1`, según manual Ventas pp. 9–11, para usar políticas de Microsip.
No llama `SetReglasVentas` ni `SetReglasPedidos`: conserva sus validaciones y
preferencias. Los ceros del encabezado solicitan los valores documentados del
cliente para dirección, vendedor y moneda; no sustituyen IDs de artículos.

**Límite actual:** `GetDoctoVeId` acredita un ID interno, no el folio asignado.
Después de aplicar se comunica `applied-folio-unverified` sin inventar recibo y
el motor deja el pedido en `review`. `lookup` siempre devuelve `unknown` hasta
verificar una búsqueda fiable por referencia. No hay reenvío automático real.
El operador debe revisar por referencia y ejecutar `resolve`. No se han probado
precios, impuestos, stock, licencia, compatibilidad ni recuperación en Microsip.

## Verificación

`make check` revisa formato, compilación con advertencias como errores y pruebas
portables. El ejecutable de pruebas usa directorios temporales, SQLite real,
HTTP simulado y una interfaz nativa falsa; no usa credenciales ni producción.
Incluye paginación, tokens rotativos, aprobaciones posteriores, relaciones,
cantidades, aislamiento, historial, concurrencia, reinicios, pérdida de respuesta,
recibos inválidos y argumentos/orden de llamadas/aborto/limpieza nativa.

La comprobación de compatibilidad genera una base temporal con las clases
TypeScript originales, la concilia con .NET y relee el resultado desde TypeScript.
La publicación autocontenida y la inspección PE comprueban arquitectura x86;
no ejecutan Windows ni certifican Microsip. El resultado preciso de las
verificaciones se registra en `VERIFICATION.md`.
