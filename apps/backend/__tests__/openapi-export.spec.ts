import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

describe('OpenAPI export', () => {
  it('exports the current API without a database and detects contract drift', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vegyfresh-openapi-test-'));
    const output = join(directory, 'openapi.json');
    const run = (...args: string[]) =>
      execFileSync(
        process.execPath,
        [
          '-r',
          'ts-node/register',
          '-r',
          'tsconfig-paths/register',
          resolve('scripts/export-openapi.ts'),
          '--output',
          output,
          ...args,
        ],
        {
          cwd: process.cwd(),
          env: {
            POSTGRES_HOST: 'unreachable.invalid',
            JWT_SECRET: 'invalid',
          },
          encoding: 'utf8',
          stdio: 'pipe',
        },
      );

    try {
      run();
      const document = JSON.parse(readFileSync(output, 'utf8')) as {
        paths: Record<string, Record<string, unknown>>;
        components: { securitySchemes: Record<string, unknown> };
      };
      for (const path of [
        '/api/v1/auth/signup',
        '/api/v1/auth/login',
        '/api/v1/auth/refresh',
        '/api/v1/auth/logout',
        '/api/v1/portal/auth/login',
        '/api/v1/portal/auth/setup-password',
        '/api/v1/portal/auth/refresh',
        '/api/v1/portal/auth/logout',
      ]) {
        expect(document.paths[path]).toBeUndefined();
      }
      expect(document.paths['/api/v1/auth/me'].get).toHaveProperty('security');
      expect(document.paths['/api/v1/portal/auth/me'].get).toHaveProperty(
        'security',
      );
      expect(document.paths['/api/v1/portal/orders'].get).toBeDefined();
      expect(document.components.securitySchemes.bearer).toBeDefined();
      expect(() => run('--check')).not.toThrow();
      writeFileSync(output, '{}\n');
      expect(() => run('--check')).toThrow();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 60_000);
});
