import { readdirSync, realpathSync, statSync } from 'fs';
import { extname, join } from 'path';

const glob = (...segments: string[]) => join(...segments).replace(/\\/g, '/');

// Recursive globs do not follow linked top-level source directories. Resolve
// each entry first so entity imports share the same physical module identity.
export function entityPaths(): string[] {
  const sourceRoot = join(__dirname, '..');
  const directories = new Set(
    readdirSync(sourceRoot)
      .map((entry) => realpathSync(join(sourceRoot, entry)))
      .filter((entry) => statSync(entry).isDirectory()),
  );
  const extension = extname(__filename);
  return [
    glob(sourceRoot, `*.entity${extension}`),
    ...[...directories]
      .sort()
      .map((directory) => glob(directory, '**', `*.entity${extension}`)),
  ];
}

export function migrationPaths(): string[] {
  return [glob(__dirname, 'migrations', `*${extname(__filename)}`)];
}
