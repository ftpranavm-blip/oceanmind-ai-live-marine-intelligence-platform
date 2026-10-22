// Renders the AIS module to static HTML with the data hooks mocked. Only the
// default (CSV) tab renders this way; the button handlers call the functions
// in lib/aisForm.ts, which are tested in aisForm.test.ts.
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useQueries', () => ({
  useSaveAISAnalysis: () => ({ mutateAsync: async () => true, isPending: false }),
  useGetAISAnalysisHistory: () => ({ data: [], isLoading: false }),
}));

const { default: AISModule } = await import('./AISModule');
const html = renderToStaticMarkup(<AISModule />);
const source = readFileSync(new URL('./AISModule.tsx', import.meta.url), 'utf8');

describe('AIS module', () => {
  it('never says "illegal fishing"', () => {
    expect(html).not.toMatch(/illegal fishing/i);
    expect(source).not.toMatch(/illegal fishing/i);
  });

  it('offers the dated anonymised sample with its credit', () => {
    expect(html).toContain('Use sample file (2026-06-30)');
    expect(html).toContain('MarineCadastre (NOAA/BOEM)');
    expect(html).toMatch(/derived, anonymised/);
  });

  it('states the upload limit and what the rules mean', () => {
    expect(html).toContain('20 MB');
    expect(html).toMatch(/behaviour to review, not wrongdoing/);
  });

  it('shows the source of the current values, starting as manual entry', () => {
    expect(html).toMatch(/Source:.*Manual entry/);
  });

  it('keeps the stream tab labelled as simulated', () => {
    expect(html).toContain('Simulated Stream');
  });
});
