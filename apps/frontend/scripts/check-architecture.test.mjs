import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const compiler = pathToFileURL(require.resolve('typescript')).href;
const checker = fs.readFileSync(new URL('./check-architecture.mjs', import.meta.url), 'utf8');

function check(files) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vegyfresh-architecture-'));
  try {
    fs.mkdirSync(path.join(directory, 'src'));
    fs.writeFileSync(path.join(directory, 'tsconfig.app.json'), JSON.stringify({
      compilerOptions: { paths: { '@/*': ['./src/*'] }, moduleResolution: 'bundler', module: 'ESNext' },
    }));
    for (const [filename, contents] of Object.entries(files)) {
      const target = path.join(directory, 'src', filename);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, contents);
    }
    const script = checker
      .replace("import ts from 'typescript';", `import ts from ${JSON.stringify(compiler)};`)
      .replace("const root = fileURLToPath(new URL('../', import.meta.url));", `const root = ${JSON.stringify(directory)};`);
    const filename = path.join(directory, 'check.mjs');
    fs.writeFileSync(filename, script);
    const result = spawnSync(process.execPath, [filename], { encoding: 'utf8' });
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('permits inward ports and browser adapters without confusing document fields with globals', () => {
  const result = check({
    'domain/item.ts': 'export type Item = { id: string };',
    'application/items.ts': "import type { Item } from '@/domain/item'; export type Port = { document: Item };",
    'infrastructure/items.ts': "import type { Port } from '@/application/items'; export const read = () => window.localStorage.getItem('item');",
    'presentation/page.ts': "import { read } from '@/infrastructure/items'; export const load = read;",
  });
  assert.equal(result.status, 0, result.output);
});

test('rejects outer dependencies in application including reexports', () => {
  const result = check({
    'infrastructure/items.ts': 'export const read = () => 1;',
    'application/items.ts': "export { read } from '@/infrastructure/items';",
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /Dependencia fuera de la capa application/);
});

test('rejects frameworks and browser IO in inner layers', () => {
  const result = check({
    'application/items.ts': "import { useState } from 'react'; export const read = () => fetch('/items');",
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /dependencias externas: react/);
  assert.match(result.output, /APIs del navegador: fetch/);
});

test('rejects direct transport, aliased React Query hooks and browser storage in presentation', () => {
  const result = check({
    'infrastructure/api/requests.ts': 'export const read = () => 1;',
    'presentation/page.ts': "import { read } from '@/infrastructure/api/requests'; import { useQuery as query } from '@tanstack/react-query'; export const load = () => localStorage.getItem('item');",
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /peticiones HTTP directamente/);
  assert.match(result.output, /React Query pertenece a infrastructure: useQuery/);
  assert.match(result.output, /almacenamiento del navegador/);
});


test('keeps API transport independent from query integration', () => {
  const result = check({
    'infrastructure/query/index.ts': 'export const options = {};',
    'infrastructure/api/index.ts': "export { options } from '../query'; import { queryOptions } from '@tanstack/react-query';",
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /transporte API no debe depender/);
});
