// Source checks that the UI does not present generated data as live data.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = (name: string) => readFileSync(new URL(`../pages/${name}`, import.meta.url), 'utf8');

// User-visible text: JSX text nodes and string/template literals.
function visibleText(source: string): string[] {
  const jsxText = [...source.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)].map(m => m[1].trim());
  const literals = [...source.matchAll(/(['"`])((?:(?!\1).)*[A-Za-z](?:(?!\1).)*)\1/g)].map(m => m[2]);
  return [...jsxText, ...literals];
}

// Pages whose readings come from Math.random.
const simulatedPages = ['SatelliteModule.tsx', 'CoralModule.tsx', 'AISModule.tsx', 'IoTModule.tsx'];

describe('honest labels on simulated modules', () => {
  it.each(simulatedPages)('%s generates readings with Math.random (premise)', name => {
    expect(page(name)).toMatch(/Math\.random\(/);
  });

  it.each(simulatedPages)('%s has no "live" or "real-time" wording', name => {
    const offending = visibleText(page(name)).filter(t => /\blive\b|real-?time/i.test(t));
    expect(offending).toEqual([]);
  });

  it.each(simulatedPages)('%s says "Simulated" in its UI', name => {
    expect(visibleText(page(name)).some(t => /\bsimulated\b/i.test(t))).toBe(true);
  });

  it('Live Ocean Map labels its hardcoded vessels as sample data', () => {
    const texts = visibleText(page('LiveOceanMapModule.tsx'));
    expect(texts.filter(t => /real-?time vessel positions|live vessel data/i.test(t))).toEqual([]);
    expect(texts.some(t => /sample vessel data/i.test(t))).toBe(true);
  });

  it('Command Center does not describe simulated modules as live', () => {
    const descriptions = [...page('CommandCenter.tsx').matchAll(/description: '([^']*)'/g)].map(m => m[1]);
    expect(descriptions.filter(d => /\blive\b|real-?time/i.test(d))).toEqual([]);
  });
});

describe('AI recommendation contacts', () => {
  const contacts = [...page('FusionModule.tsx').matchAll(/contactInfo: '([^']*)'/g)].map(m => m[1]);

  it('lists contacts (premise)', () => {
    expect(contacts.length).toBeGreaterThan(0);
  });

  it('uses only reserved example.org addresses marked as placeholders', () => {
    expect(contacts.filter(c => !/^[a-z0-9.-]+@example\.org \(placeholder\)$/.test(c))).toEqual([]);
  });

  it('shows a placeholder badge next to each contact', () => {
    expect(page('FusionModule.tsx')).toMatch(/Placeholder contact/);
  });
});
