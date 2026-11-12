import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString, COMMENT_HEADER } from "openapi-typescript";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const openApiUrl = process.env.API_SCHEMA_URL ?? process.env.VITE_API_URL_JSON;

if (!openApiUrl) {
  throw new Error("API_SCHEMA_URL o VITE_API_URL_JSON es requerido");
}

const outputPath = resolve(packageRoot, "src/generated/schema.ts");
const ast = await openapiTS(new URL(openApiUrl));

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${COMMENT_HEADER}${astToString(ast)}`, "utf8");

console.log(`Tipos del API generados desde ${openApiUrl}`);
