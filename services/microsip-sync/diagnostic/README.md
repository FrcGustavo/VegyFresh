# Diagnóstico Microsip para Windows x86

Diagnóstico independiente del motor C#/.NET 10 y del puente de escritura.
El servicio TypeScript sigue disponible como referencia de comportamiento.
Este programa no consulta VegyFresh ni crea pedidos, datasets o SQL. Únicamente
carga la DLL y, con `connect`, abre y cierra una conexión usando la API oficial.
La conexión puede ocupar temporalmente una licencia de API.

## Compilar

Con .NET SDK 10, desde este directorio:

```powershell
dotnet publish -c Release -o bin/publish
```

O desde la raíz del repositorio, con Docker:

```sh
make -C services/microsip-sync diagnostic-build
```

Copiar **todo** `bin/publish` a Windows (o `../artifacts/win-x86/diagnostic`
cuando se compiló mediante Make). Es autocontenido, x86, sin Node.js ni
runtime .NET adicional. La DLL propietaria y sus dependencias x86 se obtienen
del paquete autorizado de Microsip; no se distribuyen en Git ni en este build.
Conservarlas juntas en un directorio local confiable. No reemplazar archivos de
la instalación productiva para esta prueba.

## Cargar y reportar versión

```powershell
.\Microsip.Diagnostic.exe inspect 'C:\MicrosipApi\ApiMicrosip.dll'
```

Requiere ruta absoluta. Informa versión del recurso de Windows (puede estar
vacía si el proveedor no la incluye), SHA-256, carga nativa y presencia de los
exports utilizados. No supone que exista una función nativa de versión. Un
error Windows 193 suele indicar arquitectura incompatible; 126 puede indicar
una dependencia faltante. La búsqueda de dependencias utiliza el directorio de
la DLL y System32, sin el directorio de trabajo.

## Conexión de prueba

Usar una empresa de prueba autorizada. Configurar localmente estas variables;
el programa no imprime sus valores ni mensajes arbitrarios del proveedor:

```powershell
$env:MICROSIP_DIAG_DATABASE = 'SERVIDOR:C:\Microsip datos\EmpresaPrueba.fdb'
$env:MICROSIP_DIAG_USER = Read-Host 'Usuario Firebird'
$secret = Read-Host 'Contraseña Firebird' -AsSecureString
$env:MICROSIP_DIAG_PASSWORD = [System.Net.NetworkCredential]::new('', $secret).Password
try {
    .\Microsip.Diagnostic.exe connect 'C:\MicrosipApi\ApiMicrosip.dll'
    $diagnosticExit = $LASTEXITCODE
} finally {
    Remove-Item Env:MICROSIP_DIAG_PASSWORD
    Remove-Item Env:MICROSIP_DIAG_USER
    Remove-Item Env:MICROSIP_DIAG_DATABASE
    $secret.Dispose()
}
$diagnosticExit
```

Salida JSON por etapa. Códigos del proceso: 0 éxito, 1 fallo de carga/API,
2 uso/configuración/plataforma inválida. `connect.code` es el retorno oficial de
DBConnect: 0 éxito, 1 handle inválido, 2 falta transacción, 3 base inexistente,
4 autenticación incorrecta, 5 ya conectada, 6 comprobación de licencia fallida,
7 incompatibilidad con Firebird según el manual del paquete. No interpretar 6
como prueba de que no se contrató licencia: puede estar ocupada o fallar el candado.
El manual indica que DBConnect comprueba la licencia al abrir la primera base,
y DBDisconnect la libera al cerrar la última. Se verifica además DBConnected.
Una conexión exitosa sólo acredita disponibilidad en ese momento.

La transacción creada es tipo 1, de sólo lectura según el manual; no se inicia
ni se confirma. Se desconecta y se liberan recursos en `finally`. Si una llamada
nativa se bloquea o el proceso termina abruptamente, no se garantiza ejecutar
la limpieza; verificar la liberación de licencia con el administrador antes de
repetir. No hay reintento automático.

## Procedencia y límites

Firmas contrastadas con `ApiMspBasicaExt.pas` y el manual de acceso básico del
paquete API 2026 descargado previamente en `/tmp/microsip-api2026.zip` (DLL
fechada el 7 de mayo de 2026). Se declara explícitamente `StdCall`, nombres
exactos, ANSI para `PAnsiChar` y retornos `int` de 32 bits. No se usa
`SetLastError` para funciones Microsip: sus errores se obtienen de la API.
Sólo se incorporan las declaraciones utilizadas, no los wrappers completos
que incluyen operaciones de escritura. El [ejemplo oficial .NET](https://soporte.microsip.com/utilerias-microsip/api-ejemplo-de-uso-en-net)
no sustituye esas firmas ni certifica esta instalación.

Pendiente ejecutar ambos modos en Windows con la DLL autorizada y comprobar
empresa/licencia. Este diagnóstico no certifica búsqueda de clientes, claves,
unidades, almacenes, referencias externas ni cálculo de precios. Esas pruebas
preceden al primer pedido y a la migración completa del motor y sus escenarios
de persistencia, conciliación e interrupciones.

Verificación en macOS el 17 de noviembre de 2026: publicación Release con SDK
10 en Docker, warnings tratados como errores; encabezados PE del ejecutable y
la DLL del paquete confirmados como x86 (0x14c), runtime autocontenido presente
y ZIP comprobado. No se ejecutaron pruebas de carga/conexión nativa en Windows,
ni la suite TypeScript (su código no cambió).
