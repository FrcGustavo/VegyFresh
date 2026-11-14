const fs = require('node:fs');
const path = require('node:path');

// Moved source still belongs to the backend package until the workspace cutover.
const packageRoot = path.resolve(__dirname, '..');
const serviceRoot = path.resolve(packageRoot, '../../services/backend');
const link = path.join(serviceRoot, 'node_modules');
const target = path.join(packageRoot, 'node_modules');

fs.mkdirSync(serviceRoot, { recursive: true });
let existing;
try {
  existing = fs.lstatSync(link);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (existing) {
  if (!existing.isSymbolicLink() || path.resolve(serviceRoot, fs.readlinkSync(link)) !== target) {
    throw new Error(`Cannot install backend source bridge: ${link} already exists`);
  }
} else {
  fs.symlinkSync(
    process.platform === 'win32' ? target : path.relative(serviceRoot, target),
    link,
    process.platform === 'win32' ? 'junction' : 'dir',
  );
}
