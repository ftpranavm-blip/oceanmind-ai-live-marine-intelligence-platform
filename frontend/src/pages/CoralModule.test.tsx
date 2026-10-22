// Renders the Coral module to static HTML with the data hooks mocked.
// Only the default tab is rendered this way; the NOAA CRW button handler
// copies crwReadingForRegion() (tested in lib/crwReading.test.ts) into state.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CORAL_REGIONS } from '../lib/coralRegions';

vi.mock('../hooks/useQueries', () => ({
  useSaveCoralAnalysis: () => ({ mutateAsync: async () => true, isPending: false }),
  useGetCoralAnalysisHistory: () => ({ data: [], isLoading: false }),
  useGetCoralRegionCoordinates: () => ({ data: CORAL_REGIONS }),
}));

const { default: CoralModule } = await import('./CoralModule');
const html = renderToStaticMarkup(<CoralModule />);

describe('Coral module', () => {
  it('offers a NOAA CRW tab instead of a simulated NOAA reading', () => {
    expect(html).toContain('NOAA CRW');
    expect(html).not.toContain('Simulated NOAA');
  });

  it('shows the source of the current values, starting as manual entry', () => {
    expect(html).toMatch(/Source:.*Manual entry/);
  });

  it('keeps the image path labelled as simulated', () => {
    expect(html).toContain('Generate Simulated Reading');
  });
});
