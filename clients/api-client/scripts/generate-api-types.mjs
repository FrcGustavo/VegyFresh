import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import openapiTS, { astToString, COMMENT_HEADER } from "openapi-typescript";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const openApiUrl = process.env.API_SCHEMA_URL ?? process.env.VITE_API_URL_JSON ?? resolve(packageRoot, "openapi.json");

const outputPath = resolve(packageRoot, "src/generated/schema.ts");
const ast = await openapiTS(/^https?:/.test(openApiUrl) ? new URL(openApiUrl) : pathToFileURL(openApiUrl));

await mkdir(dirname(outputPath), { recursive: true });
const content = `${COMMENT_HEADER}${astToString(ast)}`;
if (process.argv.includes("--check")) {
  if (await readFile(outputPath, "utf8") !== content) {
    throw new Error("Generated types differ from OpenAPI. Run pnpm --filter @vegyfresh/api-client generate:api-types.");
  }
} else {
  await writeFile(outputPath, content, "utf8");
}

console.log(`Tipos del API generados desde ${openApiUrl}`);
