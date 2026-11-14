import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = path.join(root, 'src');
const shared = path.join(src, 'presentation', 'components') + path.sep;
const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filename) : /\.tsx?$/.test(filename) ? [filename] : [];
  });
const files = walk(src).filter((filename) => !/\.(?:test|spec)\.tsx?$/.test(filename));
const config = ts.readConfigFile(path.join(root, 'tsconfig.app.json'), ts.sys.readFile);
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const cache = ts.createModuleResolutionCache(root, (filename) => filename, options);
const dependencies = new Map();
const errors = new Set();
const report = (file, message) => errors.add(`${path.relative(root, file)}: ${message}`);

for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const targets = [];
  const layer = path.relative(src, file).split(path.sep)[0];
  const inspect = (node) => {
    let specifier;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
      specifier = node.arguments[0];
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) specifier = node.argument.literal;
    if (specifier && ts.isStringLiteral(specifier)) {
      const name = specifier.text;
      if (['domain', 'application'].includes(layer) && !/^(?:\.|@\/)/.test(name)) {
        report(file, `La capa ${layer} no admite dependencias externas: ${name}`);
      }
      if (layer === 'presentation' && ['axios', 'openapi-fetch'].includes(name)) {
        report(file, `El transporte HTTP pertenece a infrastructure: ${name}`);
      }
      if (layer === 'presentation' && name === '@tanstack/react-query' && ts.isImportDeclaration(node)) {
        const bindings = node.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            const imported = (element.propertyName ?? element.name).text;
            if (/^use(?:Query|InfiniteQuery|Mutation|SuspenseQuery|SuspenseInfiniteQuery|QueryClient)$/.test(imported)) {
              report(file, `La integración React Query pertenece a infrastructure: ${imported}`);
            }
          }
        } else {
          report(file, 'Importa explícitamente la composición React Query; los hooks pertenecen a infrastructure.');
        }
      }
      const target = ts.resolveModuleName(name, file, options, ts.sys, cache).resolvedModule?.resolvedFileName;
      if (target?.startsWith(src + path.sep)) {
        targets.push(target);
        if (layer === 'presentation' && target === path.join(src, 'infrastructure', 'api', 'requests.ts')) {
          report(file, 'Invoca casos de uso o hooks de infraestructura, no peticiones HTTP directamente.');
        }
      }
      else if (
        !target &&
        !/\.(?:css|svg|png|jpg|webp|json)$/.test(name) &&
        /^(?:\.|@\/)/.test(name)
      ) {
        report(file, `Importación local sin resolver: ${name}`);
      }
    }
    if (layer === 'presentation' && (ts.isCallExpression(node) || ts.isNewExpression(node)) &&
      ts.isIdentifier(node.expression) && ['fetch', 'XMLHttpRequest'].includes(node.expression.text)) {
      report(file, 'El transporte HTTP pertenece a infrastructure.');
    }
    if (layer === 'presentation' && ts.isPropertyAccessExpression(node) &&
      ['localStorage', 'sessionStorage'].includes(node.name.text)) {
      report(file, 'El almacenamiento del navegador pertenece a infrastructure.');
    }
    if (layer === 'presentation' && ts.isIdentifier(node) &&
      ['localStorage', 'sessionStorage'].includes(node.text)) {
      report(file, 'El almacenamiento del navegador pertenece a infrastructure.');
    }
    if (['domain', 'application'].includes(layer)) {
      const browserObject = ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) &&
        ['window', 'document', 'localStorage', 'sessionStorage'].includes(node.expression.text);
      const browserCall = (ts.isCallExpression(node) || ts.isNewExpression(node)) &&
        ts.isIdentifier(node.expression) && ['fetch', 'XMLHttpRequest'].includes(node.expression.text);
      if (browserObject || browserCall) {
        report(file, `La capa ${layer} no admite acceso a APIs del navegador: ${node.expression.getText(source)}`);
      }
    }
    ts.forEachChild(node, inspect);
  };
  inspect(source);
  dependencies.set(file, targets);
}

for (const [file, targets] of dependencies) {
  const layer = path.relative(src, file).split(path.sep)[0];
  for (const target of targets) {
    const dependencyLayer = path.relative(src, target).split(path.sep)[0];
    if (
      (layer === 'domain' && dependencyLayer !== 'domain') ||
      (layer === 'application' && !['domain', 'application'].includes(dependencyLayer)) ||
      (layer === 'infrastructure' && !['domain', 'application', 'infrastructure'].includes(dependencyLayer))
    ) {
      report(file, `Dependencia fuera de la capa ${layer}: ${path.relative(src, target)}`);
    }
  }
}

for (const file of files.filter((filename) => filename.startsWith(shared))) {
  const visited = new Set([file]);
  const pending = [...dependencies.get(file)];
  while (pending.length) {
    const target = pending.pop();
    if (visited.has(target)) continue;
    visited.add(target);
    const relative = path.relative(src, target).split(path.sep).join('/');
    if (/^(?:infrastructure\/(?!preferences\/)|presentation\/(?:auth|clients|inventory|orders|organization|organizations|products|purchases|settings|suppliers|users|warehouse))\//.test(relative)) {
      report(file, `El componente compartido depende del negocio (${relative}); recibe datos o contenido por props.`);
      continue;
    }
    pending.push(...(dependencies.get(target) || []));
  }
}

const complete = new Set();
const active = new Set();
function visit(file, trail = []) {
  if (active.has(file)) {
    report(file, `Dependencia circular: ${[...trail, file].map((item) => path.relative(src, item)).join(' → ')}`);
    return;
  }
  if (complete.has(file)) return;
  active.add(file);
  for (const target of dependencies.get(file) || []) {
    if (target.startsWith(shared)) visit(target, [...trail, file]);
  }
  active.delete(file);
  complete.add(file);
}
for (const file of files.filter((filename) => filename.startsWith(shared))) visit(file);

if (errors.size) {
  console.error([...errors].join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `${files.length} archivos verificados, sin dependencias fuera de capa ni ciclos entre componentes compartidos.`,
  );
}
