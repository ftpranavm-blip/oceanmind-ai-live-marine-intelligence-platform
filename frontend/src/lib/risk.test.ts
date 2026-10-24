import { describe, expect, it } from 'vitest';
import {
  averageRisk,
  coralRiskScore,
  isAisAlert,
  isCoralAlert,
  isIotAlert,
  isSatelliteHighRisk,
  moduleSeverityBand,
  satelliteRiskScore,
  vesselRiskBand,
} from './risk';

const noFlags = {
  vesselCount: 0,
  clusterFlag: false,
  pollutionFlag: false,
  nearCoral: false,
  marineProtectedAreaFlag: false,
};

describe('satelliteRiskScore', () => {
  it('is 0 with no vessels and no flags', () => {
    expect(satelliteRiskScore(noFlags)).toBe(0);
  });

  it('adds 0.5 per vessel, capped at 3', () => {
    expect(satelliteRiskScore({ ...noFlags, vesselCount: 4 })).toBe(2);
    expect(satelliteRiskScore({ ...noFlags, vesselCount: 100 })).toBe(3);
  });

  it('adds the weight of each flag', () => {
    expect(satelliteRiskScore({ ...noFlags, clusterFlag: true })).toBe(2);
    expect(satelliteRiskScore({ ...noFlags, pollutionFlag: true })).toBe(2.5);
    expect(satelliteRiskScore({ ...noFlags, nearCoral: true })).toBe(1.5);
    expect(satelliteRiskScore({ ...noFlags, marineProtectedAreaFlag: true })).toBe(3);
  });

  it('caps the total at 10', () => {
    const all = { vesselCount: 20, clusterFlag: true, pollutionFlag: true, nearCoral: true, marineProtectedAreaFlag: true };
    expect(satelliteRiskScore(all)).toBe(10);
  });
});

describe('coralRiskScore', () => {
  it('weights bleaching 0.6 and thermal stress 0.4', () => {
    expect(coralRiskScore(10, 0)).toBeCloseTo(6);
    expect(coralRiskScore(0, 10)).toBeCloseTo(4);
    expect(coralRiskScore(5, 5)).toBeCloseTo(5);
  });

  it('caps at 10', () => {
    expect(coralRiskScore(20, 20)).toBe(10);
  });
});

describe('module alert thresholds (0-10 scale)', () => {
  it('satellite high risk at >= 7', () => {
    expect(isSatelliteHighRisk(6.99)).toBe(false);
    expect(isSatelliteHighRisk(7)).toBe(true);
  });

  it('coral alert at >= 6', () => {
    expect(isCoralAlert(5.99)).toBe(false);
    expect(isCoralAlert(6)).toBe(true);
  });

  it('AIS and IoT alert at >= 7', () => {
    expect(isAisAlert(6.99)).toBe(false);
    expect(isAisAlert(7)).toBe(true);
    expect(isIotAlert(6.99)).toBe(false);
    expect(isIotAlert(7)).toBe(true);
  });
});

describe('averageRisk', () => {
  it('is 0 for no records', () => {
    expect(averageRisk([])).toBe(0);
  });

  it('is the mean riskScore', () => {
    expect(averageRisk([{ riskScore: 2 }, { riskScore: 4 }, { riskScore: 9 }])).toBe(5);
  });
});

describe('severity bands', () => {
  it('module scale: Critical >= 7, Elevated >= 4, else Normal', () => {
    expect(moduleSeverityBand(3.99)).toBe('Normal');
    expect(moduleSeverityBand(4)).toBe('Elevated');
    expect(moduleSeverityBand(7)).toBe('Critical');
  });

  it('vessel scale (0-1): Critical >= 0.75, High >= 0.5, Moderate >= 0.25, else Low', () => {
    expect(vesselRiskBand(0.2)).toBe('Low');
    expect(vesselRiskBand(0.25)).toBe('Moderate');
    expect(vesselRiskBand(0.5)).toBe('High');
    expect(vesselRiskBand(0.75)).toBe('Critical');
  });
});
