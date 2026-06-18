import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript';
import { loadEnv } from 'vite';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = loadEnv(process.env.MODE ?? 'development', frontendRoot, '');
const openApiUrl = process.env.VITE_API_URL_JSON ?? env.VITE_API_URL_JSON;

if (!openApiUrl) {
  throw new Error('VITE_API_URL_JSON is required to generate API types');
}

const docsUrl = new URL(openApiUrl);

const outputPath = resolve(frontendRoot, 'src/api/generated/schema.ts');
const ast = await openapiTS(docsUrl);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${COMMENT_HEADER}${astToString(ast)}`, 'utf8');

console.log(`Generated API types from ${docsUrl.href}`);
