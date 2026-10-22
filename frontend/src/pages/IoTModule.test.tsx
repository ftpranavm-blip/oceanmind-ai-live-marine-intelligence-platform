// Renders the IoT module to static HTML with the data hooks mocked. Only the
// default (CSV) tab renders this way; the NDBC button handler copies
// loadNdbcReading() (tested in lib/iotForm.test.ts) into state.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useQueries', () => ({
  useSaveIoTAnalysis: () => ({ mutateAsync: async () => true, isPending: false }),
  useGetIoTAnalysisHistory: () => ({ data: [], isLoading: false }),
}));

const { default: IoTModule } = await import('./IoTModule');
const html = renderToStaticMarkup(<IoTModule />);

describe('IoT module', () => {
  it('offers a NOAA NDBC tab instead of a simulated buoy', () => {
    expect(html).toContain('NOAA NDBC');
    expect(html).not.toContain('Simulated Buoy');
  });

  it('shows the source of the current values, starting as manual entry', () => {
    expect(html).toMatch(/Source:.*Manual entry/);
  });

  it('keeps the CSV path labelled as simulated', () => {
    expect(html).toContain('Generate Simulated Reading');
  });
});
