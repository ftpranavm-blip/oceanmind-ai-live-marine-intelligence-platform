// Ownership rules for stored records (backend/ownership.mo), run in the Motoko
// interpreter, plus a source check that main.mo routes every save and history
// query through them. This does not call a deployed canister.
import { beforeAll, describe, expect, it } from 'vitest';
import { checkMain, loadBackend, readBackendSource, runMotoko } from '../test-utils/motoko';

const prelude = `
import Principal "mo:core/Principal";
import Debug "mo:core/Debug";
import Ownership "ownership";
let alice = Principal.fromText("aaaaa-aa");
let bob = Principal.fromText("2vxsx-fae");
`;

function evalBool(expr: string): boolean {
  const { stdout, stderr } = runMotoko(`${prelude}\nDebug.print(debug_show(${expr}));\n`);
  expect(stderr).toBe('');
  return stdout.trim() === 'true';
}

beforeAll(() => {
  loadBackend();
});

describe('main.mo still type-checks with the ownership module', () => {
  it('has no errors or build.sh-promoted warnings', () => {
    expect(checkMain()).toEqual([]);
  });
});

describe('access control: writing under an existing id', () => {
  it('anyone may create a record under a new id', () => {
    expect(evalBool('Ownership.mayWrite(null, bob, false)')).toBe(true);
  });

  it('the owner may overwrite their own record', () => {
    expect(evalBool('Ownership.mayWrite(?{ owner = alice }, alice, false)')).toBe(true);
  });

  it("another user may not overwrite someone else's record", () => {
    expect(evalBool('Ownership.mayWrite(?{ owner = alice }, bob, false)')).toBe(false);
  });

  it('an admin may overwrite any record (same rule as updateAlert)', () => {
    expect(evalBool('Ownership.mayWrite(?{ owner = alice }, bob, true)')).toBe(true);
  });
});

describe('access control: reading history', () => {
  const list = `[{ owner = alice; n = 1 }, { owner = bob; n = 2 }, { owner = alice; n = 3 }]`;
  const visible = (caller: string, admin: boolean): string => {
    const { stdout, stderr } = runMotoko(`${prelude}
let shown = Ownership.visibleTo(${list}.values(), ${caller}, ${admin});
for (r in shown.values()) { Debug.print(debug_show(r.n)) };
`);
    expect(stderr).toBe('');
    return stdout.trim().split('\n').join(',');
  };

  it("a user sees only their own records", () => {
    expect(visible('alice', false)).toBe('1,3');
    expect(visible('bob', false)).toBe('2');
  });

  it('an admin sees every record', () => {
    expect(visible('bob', true)).toBe('1,2,3');
  });

  it("a user may not read someone else's single record", () => {
    expect(evalBool('Ownership.mayRead({ owner = alice }, bob, false)')).toBe(false);
    expect(evalBool('Ownership.mayRead({ owner = alice }, alice, false)')).toBe(true);
    expect(evalBool('Ownership.mayRead({ owner = alice }, bob, true)')).toBe(true);
  });
});

// Source check: each endpoint must call the rules above.
describe('main.mo wiring', () => {
  const main = readBackendSource('main.mo');
  const body = (name: string): string => {
    const start = main.search(new RegExp(`func ${name}\\b`));
    expect(start, `${name} not found`).toBeGreaterThan(-1);
    const next = main.slice(start + 1).search(/\n  public /);
    return next === -1 ? main.slice(start) : main.slice(start, start + 1 + next);
  };

  it.each(['saveAlert', 'saveSatelliteAnalysis', 'saveAISAnalysis', 'saveIoTAnalysis', 'saveFusionAnalysis'])(
    '%s checks the existing owner before writing',
    name => {
      expect(body(name)).toMatch(/requireWritable\(/);
    },
  );

  it.each([
    'getSatelliteAnalysisHistory',
    'getCoralAnalysisHistory',
    'getAISAnalysisHistory',
    'getIoTAnalysisHistory',
    'getFusionAnalysisHistory',
  ])('%s filters records by owner', name => {
    expect(body(name)).toMatch(/Ownership\.visibleTo\(/);
  });

  it('getAIRecommendations checks the record owner', () => {
    expect(body('getAIRecommendations')).toMatch(/Ownership\.mayRead\(/);
  });
});
