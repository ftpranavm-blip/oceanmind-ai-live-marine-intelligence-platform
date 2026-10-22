// Runs backend/analysis-rules.mo (the rules main.mo uses when saving coral,
// AIS and IoT analyses) through the Motoko interpreter from the motoko npm package.
// This tests the rules module, not a deployed canister.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import mo from 'motoko';
import corePackage from 'motoko/packages/latest/core.json';
import { isAisAlert, isCoralAlert, isIotAlert } from './risk';

const backendDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'backend');

function loadBackend(dir: string) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) loadBackend(path);
    else if (name.endsWith('.mo')) mo.write(relative(backendDir, path).split(sep).join('/'), readFileSync(path, 'utf8'));
  }
}

function runMotoko(source: string): { stdout: string; stderr: string } {
  mo.write('test.mo', source);
  const { stdout, stderr } = mo.run('test.mo');
  // The interpreter echoes the program's final value (`() : ()`); drop it.
  return { stdout: stdout.replace(/\(\) : \(\)\s*$/, ''), stderr };
}

const prelude = `
import Map "mo:core/Map";
import Text "mo:core/Text";
import Debug "mo:core/Debug";
import Rules "analysis-rules";
`;

beforeAll(() => {
  mo.loadPackage(corePackage);
  loadBackend(backendDir);
});

describe('backend analysis rules harness', () => {
  it('type-checks main.mo with the rules module', () => {
    // Production moc resolves `.toArray()` on iterators via --implicit-package core,
    // which the npm build lacks; importing Iter gives the same resolution.
    mo.write('main.mo', 'import Iter "mo:core/Iter";\n' + readFileSync(join(backendDir, 'main.mo'), 'utf8'));
    const diagnostics: { severity: number; code?: string; source: string; message: string }[] = mo.check('main.mo');
    // build.sh promotes these warnings to errors (-E M0236 -E M0235 -E M0223 -E M0237).
    const promoted = new Set(['M0236', 'M0235', 'M0223', 'M0237']);
    const errors = diagnostics.filter(d => d.severity === 1 || promoted.has(d.code ?? ''));
    expect(errors.map(d => `${d.source}: ${d.code} ${d.message}`)).toEqual([]);
  });
});

// Suspected bug 2: coralAnalyses is keyed by region, so a second analysis of
// the same region replaces the first.
describe('bug 2: coral analyses for the same region', () => {
  it('two saves for one region keep both records', () => {
    const { stdout, stderr } = runMotoko(`${prelude}
let store = Map.empty<Text, Text>();
store.add(Rules.coralRecordKey("Great Barrier Reef (Australia)", 0), "first");
store.add(Rules.coralRecordKey("Great Barrier Reef (Australia)", 1), "second");
Debug.print(debug_show(store.size()));
`);
    expect(stderr).toBe('');
    expect(stdout.trim()).toBe('2');
  });

  it('keys from different regions never collide', () => {
    const { stdout, stderr } = runMotoko(`${prelude}
Debug.print(debug_show(Rules.coralRecordKey("Maldives", 0) == Rules.coralRecordKey("Red Sea", 0)));
`);
    expect(stderr).toBe('');
    expect(stdout.trim()).toBe('false');
  });
});

// Suspected bug 3: the backend hardcodes alertStatus = false for coral, AIS
// and IoT, so the alert flag the UI computes is never stored.
describe('bug 3: stored alertStatus matches the UI alert rule', () => {
  const scores = [0, 3.5, 5.99, 6, 6.5, 6.99, 7, 8.2, 10];

  const backendFlags = (fn: string): boolean[] => {
    const { stdout, stderr } = runMotoko(`${prelude}
for (s in [${scores.map(s => s.toFixed(2)).join(', ')}].values()) { Debug.print(debug_show(Rules.${fn}(s))) };
`);
    expect(stderr).toBe('');
    return stdout.trim().split('\n').map(l => l.trim() === 'true');
  };

  it('coral', () => {
    expect(backendFlags('coralAlertStatus')).toEqual(scores.map(isCoralAlert));
  });

  it('AIS', () => {
    expect(backendFlags('aisAlertStatus')).toEqual(scores.map(isAisAlert));
  });

  it('IoT', () => {
    expect(backendFlags('iotAlertStatus')).toEqual(scores.map(isIotAlert));
  });
});
