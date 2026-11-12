import 'reflect-metadata';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { createOpenApiDocument } from '../src/openapi';

class MetadataDataSource extends DataSource {
  async prepare() {
    await this.buildMetadatas();
  }
}

async function exportOpenApi() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  if (
    args.some(
      (arg, index) =>
        arg !== '--check' &&
        arg !== '--output' &&
        (outputIndex === -1 || index !== outputIndex + 1),
    ) ||
    (outputIndex !== -1 &&
      (!args[outputIndex + 1] || args[outputIndex + 1].startsWith('--'))) ||
    args.filter((arg) => arg === '--output').length > 1 ||
    args.filter((arg) => arg === '--check').length > 1
  ) {
    throw new Error('Usage: export-openapi [--check] [--output <path>]');
  }
  const output = resolve(
    outputIndex === -1
      ? '../../clients/api-client/openapi.json'
      : args[outputIndex + 1],
  );

  // AppModule loads .env on import. Use an empty cwd and dummy environment so
  // exporting never reads host configuration or connects to a real database.
  const originalCwd = process.cwd();
  const emptyCwd = await mkdtemp(resolve(tmpdir(), 'vegyfresh-openapi-'));
  try {
    process.chdir(emptyCwd);
    process.env = {
      JWT_SECRET: 'openapi-export-only-secret-not-for-runtime',
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'openapi',
      POSTGRES_PASSWORD: 'openapi',
      POSTGRES_DB: 'openapi',
    };
    const loadAppModule = createRequire(__filename);
    const { AppModule } = loadAppModule(
      '../src/app.module',
    ) as typeof import('../src/app.module');
    const dataSource = new MetadataDataSource({
      type: 'postgres',
      entities: getMetadataArgsStorage().tables.map((table) => table.target),
    });
    await dataSource.prepare();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .compile();
    const app = module.createNestApplication({ logger: false });
    try {
      app.setGlobalPrefix('api/v1');
      const document = createOpenApiDocument(app);
      const content = `${JSON.stringify(document, null, 2)}\n`;
      if (args.includes('--check')) {
        const existing = await readFile(output, 'utf8').catch(() => '');
        if (existing !== content) {
          throw new Error(`OpenAPI document is out of date: ${output}`);
        }
        console.log(`OpenAPI document is up to date: ${output}`);
      } else {
        await writeFile(output, content, 'utf8');
        console.log(`OpenAPI document written to ${output}`);
      }
    } finally {
      await app.close();
    }
  } finally {
    process.chdir(originalCwd);
    await rm(emptyCwd, { recursive: true, force: true });
  }
}

void exportOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
