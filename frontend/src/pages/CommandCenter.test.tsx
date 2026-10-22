// Renders the Command Center to static HTML with the data hooks mocked.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const data = vi.hoisted(() => ({
  alerts: [] as unknown[],
  satellite: [] as unknown[],
  coral: [] as unknown[],
  ais: [] as unknown[],
  iot: [] as unknown[],
}));

// The five fixed demo vessels getMapData() returns (risk 0.2-0.75).
const demoVessels = [0.2, 0.45, 0.75, 0.62, 0.28].map((riskScore, i) => ({ id: `v${i}`, riskScore }));

vi.mock('../hooks/useQueries', () => ({
  useGetAllAlerts: () => ({ data: data.alerts }),
  useGetAllRiskScores: () => ({ data: [] }),
  useGetSatelliteAnalysisHistory: () => ({ data: data.satellite }),
  useGetCoralAnalysisHistory: () => ({ data: data.coral }),
  useGetAISAnalysisHistory: () => ({ data: data.ais }),
  useGetIoTAnalysisHistory: () => ({ data: data.iot }),
  useGetMapData: () => ({ data: { vessels: demoVessels } }),
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => () => {} }));

const { default: CommandCenter } = await import('./CommandCenter');

const EMPTY_TEXT = 'No analyses yet - run one in any module';

beforeEach(() => {
  data.alerts = [];
  data.satellite = [];
  data.coral = [];
  data.ais = [];
  data.iot = [];
});

describe('Command Center for a user with no analyses', () => {
  it('shows the empty state instead of a risk index from demo vessels alone', () => {
    const html = renderToStaticMarkup(<CommandCenter />);
    expect(html).toContain(EMPTY_TEXT);
    expect(html).not.toMatch(/>0\.69</);
  });

  it('still lists the modules to start from', () => {
    const html = renderToStaticMarkup(<CommandCenter />);
    for (const title of ['Satellite Intelligence', 'Coral Intelligence', 'AIS Intelligence', 'IoT Ocean Sensors']) {
      expect(html).toContain(title);
    }
  });

  it('does not claim live feeds', () => {
    expect(renderToStaticMarkup(<CommandCenter />)).not.toContain('Live feeds active');
  });
});

describe('Command Center once the user has an analysis', () => {
  it('shows the risk index and no empty state', () => {
    data.coral = [{ riskScore: 8, thermalStress: 5, bleachingProbability: 5 }];
    const html = renderToStaticMarkup(<CommandCenter />);
    expect(html).not.toContain(EMPTY_TEXT);
    // 8 * 0.2 (coral) + 4.6 * 0.15 (demo vessels, avg 0.46 on 0-10) = 2.29
    expect(html).toMatch(/>2\.29</);
  });
});
