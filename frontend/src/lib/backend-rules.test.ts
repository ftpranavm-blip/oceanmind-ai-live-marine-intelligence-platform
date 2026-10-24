// Runs backend/analysis-rules.mo (the rules main.mo uses when saving coral,
// AIS and IoT analyses) through the Motoko interpreter from the motoko npm package.
// This tests the rules module, not a deployed canister.
import { beforeAll, describe, expect, it } from 'vitest';
import { checkMain, loadBackend, runMotoko } from '../test-utils/motoko';
import { isAisAlert, isCoralAlert, isIotAlert } from './risk';

const prelude = `
import Map "mo:core/Map";
import Text "mo:core/Text";
import Debug "mo:core/Debug";
import Rules "analysis-rules";
`;

beforeAll(() => {
  loadBackend();
});

describe('backend analysis rules harness', () => {
  it('type-checks main.mo with the rules module', () => {
    expect(checkMain()).toEqual([]);
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
