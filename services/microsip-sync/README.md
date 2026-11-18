# Sincronizador Microsip (.NET 10)

Servicio local sin interfaz gráfica. El motor portable consulta la API existente
de VegyFresh mediante HTTP, conserva SQLite e incluye un simulador persistente.
El simulador persistente permite ejecutar el servicio sin Node.js. Los fuentes TypeScript
se conservan como referencia en `src/`; `make reference-check` ejecuta sus pruebas.
No se modificó la API ni se escriben estados o pedidos en VegyFresh.

## Ejecución

Con Docker en la Mac:

```sh
make -C services/microsip-sync check
make -C services/microsip-sync run ARGS='once --config sync.local.json'
make -C services/microsip-sync run ARGS='run --config sync.local.json'
make -C services/microsip-sync run ARGS='history --config sync.local.json'
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

`compose.yml` permite ejecutar continuamente el simulador Linux. Configurar
`dataDir` en `/data/simulator`, preparar `sync.local.json` y `api-token.local`, y
usar `docker compose -f services/microsip-sync/compose.yml up --build -d`.
El token montado como archivo puede requerir recrear el contenedor cuando se
renueve mediante reemplazo atómico; es preferible montar un directorio privado
de secretos gestionado.
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
| `adapter` | `{"mode":"simulator"}` predeterminado |

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

## Verificación

`make check` revisa formato, compilación con advertencias como errores y pruebas
portables. El ejecutable de pruebas usa directorios temporales, SQLite real,
HTTP simulado.
Incluye paginación, tokens rotativos, aprobaciones posteriores, relaciones,
cantidades, aislamiento, historial, concurrencia, reinicios, pérdida de respuesta,
recibos inválidos.

La comprobación de compatibilidad genera una base temporal con las clases
TypeScript originales, la concilia con .NET y relee el resultado desde TypeScript.
