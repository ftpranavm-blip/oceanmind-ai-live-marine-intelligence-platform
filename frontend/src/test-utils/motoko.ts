// Loads backend/*.mo into the Motoko interpreter from the motoko npm package,
// so tests can run backend modules without dfx or a deployed canister.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import mo from 'motoko';
import corePackage from 'motoko/packages/latest/core.json';

export const backendDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'backend');

export interface Diagnostic {
  severity: number;
  code?: string;
  source: string;
  message: string;
}

// build.sh promotes these warnings to errors (-E M0236 -E M0235 -E M0223 -E M0237).
const PROMOTED_TO_ERROR = new Set(['M0236', 'M0235', 'M0223', 'M0237']);

let loaded = false;

function loadDir(dir: string) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) loadDir(path);
    else if (name.endsWith('.mo')) mo.write(relative(backendDir, path).split(sep).join('/'), readFileSync(path, 'utf8'));
  }
}

export function loadBackend() {
  if (loaded) return;
  mo.loadPackage(corePackage);
  loadDir(backendDir);
  loaded = true;
}

export function readBackendSource(file: string): string {
  return readFileSync(join(backendDir, file), 'utf8');
}

export function runMotoko(source: string): { stdout: string; stderr: string } {
  mo.write('test.mo', source);
  const { stdout, stderr } = mo.run('test.mo');
  // The interpreter echoes the program's final value (`() : ()`); drop it.
  return { stdout: stdout.replace(/\(\) : \(\)\s*$/, ''), stderr };
}

// Type-checks main.mo and returns errors plus warnings that build.sh treats as errors.
export function checkMain(): string[] {
  // Production moc resolves `.toArray()` on iterators via --implicit-package core,
  // which the npm build lacks; importing Iter gives the same resolution.
  mo.write('main.mo', 'import Iter "mo:core/Iter";\n' + readBackendSource('main.mo'));
  const diagnostics: Diagnostic[] = mo.check('main.mo');
  return diagnostics
    .filter(d => d.severity === 1 || PROMOTED_TO_ERROR.has(d.code ?? ''))
    .map(d => `${d.source}: ${d.code} ${d.message}`);
}
