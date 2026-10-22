import { describe, expect, it } from 'vitest';
import {
  computeCorrelations,
  fusionIndexBand,
  fusionIndexPercent,
  fusionRiskScore,
  isCoralBleaching,
  isCoralEmergency,
  isHighRiskAIS,
  isHighRiskIoT,
  isHighRiskVessel,
  isHighThermalStress,
  isMpaViolation,
  isTurbidityAnomaly,
  moduleRiskAverages,
  selectRecommendationScenario,
  shouldGenerateRecommendations,
  simpleGlobalRiskIndex,
  weightedGlobalRiskIndex,
  type FusionInputs,
} from './fusion';

const sat = (o: Partial<FusionInputs['satellite'][number]> = {}) => ({
  riskScore: 0,
  clusterFlag: false,
  pollutionFlag: false,
  marina_area_flag: false,
  vesselCount: 0n,
  ...o,
});
const coral = (riskScore: number, thermalStress: number, bleachingProbability: number) => ({
  riskScore,
  thermalStress,
  bleachingProbability,
});

const empty: FusionInputs = { satellite: [], coral: [], ais: [], iot: [], vessels: [] };

// Every input at the top of its own scale: modules at 10/10, vessels at 1/1.
const allMax: FusionInputs = {
  satellite: [sat({ riskScore: 10 })],
  coral: [coral(10, 10, 10)],
  ais: [{ riskScore: 10 }],
  iot: [{ riskScore: 10, dataType: 'Temperature' }],
  vessels: [{ riskScore: 1 }],
};

// Every input low on its own scale: modules at 2/10, vessels at 0.2/1.
const allLow: FusionInputs = {
  satellite: [sat({ riskScore: 2, clusterFlag: true, pollutionFlag: true })],
  coral: [coral(2, 2, 2)],
  ais: [{ riskScore: 2 }],
  iot: [{ riskScore: 2, dataType: 'Turbidity' }],
  vessels: [{ riskScore: 0.2 }],
};

describe('regression guards (behavior that is correct today)', () => {
  it('module averages are 0 with no data', () => {
    expect(moduleRiskAverages(empty)).toEqual({ satellite: 0, coral: 0, ais: 0, iot: 0, vessel: 0 });
  });

  it('Command Center index is the mean of the four module averages', () => {
    expect(simpleGlobalRiskIndex({ satellite: 2, coral: 4, ais: 6, iot: 8 })).toBe(5);
  });

  it('MPA violation needs the MPA flag and more than 5 vessels', () => {
    expect(isMpaViolation(sat({ marina_area_flag: true, vesselCount: 5n }))).toBe(false);
    expect(isMpaViolation(sat({ marina_area_flag: true, vesselCount: 6n }))).toBe(true);
    expect(isMpaViolation(sat({ marina_area_flag: false, vesselCount: 50n }))).toBe(false);
  });

  it('high-risk vessel uses the 0-1 vessel scale (> 0.5)', () => {
    expect(isHighRiskVessel({ riskScore: 0.5 })).toBe(false);
    expect(isHighRiskVessel({ riskScore: 0.62 })).toBe(true);
  });

  it('produces six correlation metrics and no alerts for empty data', () => {
    const { metrics, alerts } = computeCorrelations(empty, 1);
    expect(metrics.map(m => m.name)).toEqual([
      'Illegal Fishing Risk',
      'Reef Emergency Risk',
      'Pollution Risk',
      'MPA Violation Risk',
      'Vessel-Coral Impact',
      'SST-Pollution Correlation',
    ]);
    expect(metrics.every(m => m.status === 'normal')).toBe(true);
    expect(alerts).toEqual([]);
  });

  it('raises an MPA alert with a timestamped id', () => {
    const { alerts } = computeCorrelations({ ...empty, satellite: [sat({ marina_area_flag: true, vesselCount: 8n })] }, 42);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ id: 'fusion_mpa_violation_42', correlationType: 'mpa_violation', severity: 9 });
  });

  it('correlation status escalates from warning to critical with count', () => {
    const mpa = (n: number) =>
      computeCorrelations({ ...empty, satellite: Array.from({ length: n }, () => sat({ marina_area_flag: true, vesselCount: 9n })) }, 1)
        .metrics.find(m => m.name === 'MPA Violation Risk')!.status;
    expect(mpa(0)).toBe('normal');
    expect(mpa(1)).toBe('warning');
    expect(mpa(3)).toBe('critical');
  });

  it('recommendation scenarios follow alert priority', () => {
    expect(selectRecommendationScenario([{ correlationType: 'mpa_violation' }, { correlationType: 'illegal_fishing' }], 0)).toBe('illegal_fishing');
    expect(selectRecommendationScenario([{ correlationType: 'pollution_correlation' }, { correlationType: 'reef_emergency' }], 0)).toBe('reef_emergency');
    expect(selectRecommendationScenario([{ correlationType: 'pollution_correlation' }], 0)).toBe('pollution');
    expect(selectRecommendationScenario([{ correlationType: 'mpa_violation' }], 0)).toBe('mpa_violation');
    expect(selectRecommendationScenario([], 0)).toBe('normal');
  });
});

// Suspected bug 1: module scores are 0-10 but vessel scores are 0-1, and the
// fusion thresholds were written for a 0-1 scale.
describe('bug 1: fusion mixes 0-10 module scores with 0-1 thresholds', () => {
  it('global risk index is 10 when every input is at its maximum', () => {
    expect(weightedGlobalRiskIndex(moduleRiskAverages(allMax))).toBeCloseTo(10);
  });

  it('fusion risk score is 10 when every input is at its maximum', () => {
    expect(fusionRiskScore(moduleRiskAverages(allMax))).toBeCloseTo(10);
  });

  it('index progress bar is 100% at the maximum index', () => {
    expect(fusionIndexPercent(10)).toBe(100);
  });

  it('all-low inputs (2/10, vessels 0.2) are banded Normal, not Critical', () => {
    expect(fusionIndexBand(weightedGlobalRiskIndex(moduleRiskAverages(allLow)))).toBe('Normal');
  });

  it('a 2/10 AIS record is not "high-risk"', () => {
    expect(isHighRiskAIS({ riskScore: 2 })).toBe(false);
  });

  it('a 2/10 IoT reading is not an anomaly', () => {
    expect(isHighRiskIoT({ riskScore: 2, dataType: 'Temperature' })).toBe(false);
    expect(isTurbidityAnomaly({ riskScore: 2, dataType: 'Turbidity' })).toBe(false);
  });

  it('2/10 coral risk and stress is not an emergency, bleaching or high thermal stress', () => {
    expect(isCoralEmergency(coral(2, 2, 2))).toBe(false);
    expect(isCoralBleaching(coral(2, 2, 2))).toBe(false);
    expect(isHighThermalStress(coral(2, 2, 2))).toBe(false);
  });

  it('all-low inputs raise no fusion alerts', () => {
    expect(computeCorrelations(allLow, 1).alerts).toEqual([]);
  });

  it('all-low inputs do not trigger the elevated-risk playbook or recommendations', () => {
    const index = weightedGlobalRiskIndex(moduleRiskAverages(allLow));
    expect(selectRecommendationScenario([], index)).toBe('normal');
    expect(shouldGenerateRecommendations(0, index)).toBe(false);
  });

  it('genuinely high inputs still raise alerts', () => {
    const high: FusionInputs = {
      satellite: [sat({ riskScore: 9, clusterFlag: true, pollutionFlag: true })],
      coral: [coral(8, 8, 8)],
      ais: [{ riskScore: 9 }],
      iot: [{ riskScore: 8, dataType: 'Turbidity' }],
      vessels: [{ riskScore: 0.8 }],
    };
    const types = computeCorrelations(high, 1).alerts.map(a => a.correlationType);
    expect(types).toEqual(expect.arrayContaining(['illegal_fishing', 'reef_emergency', 'pollution_correlation', 'climate_pollution']));
  });
});
