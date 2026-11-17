import { runCli } from "./cli.js";

const controller = new AbortController();
process.once("SIGINT", () => controller.abort());
process.once("SIGTERM", () => controller.abort());
runCli(process.argv.slice(2), controller.signal).catch(() => {
  // Drivers and API responses can contain secrets; do not print arbitrary exceptions.
  console.error("No se completó el comando. Revisa argumentos, configuración, acceso y bloqueo de empresa. Consulta README.md.");
  process.exitCode = 1;
});
