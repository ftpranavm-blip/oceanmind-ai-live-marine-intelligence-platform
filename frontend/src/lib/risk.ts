// Pure risk-scoring helpers shared by the intelligence modules.
// Module risk scores (satellite, coral, AIS, IoT) are on a 0-10 scale.
// Vessel risk scores from the backend map data are on a 0-1 scale.

export const MODULE_RISK_MAX = 10;
export const VESSEL_RISK_MAX = 1;

// Converts a 0-1 vessel risk score onto the 0-10 module scale.
export function vesselRiskOnModuleScale(vesselRisk: number): number {
  return (vesselRisk / VESSEL_RISK_MAX) * MODULE_RISK_MAX;
}

// Percentage (0-100) of a 0-10 module-scale score, for progress bars.
export function moduleRiskPercent(score: number): number {
  return (score / MODULE_RISK_MAX) * 100;
}

export const SATELLITE_HIGH_RISK_THRESHOLD = 7;
export const CORAL_ALERT_THRESHOLD = 6;
export const AIS_ALERT_THRESHOLD = 7;
export const IOT_ALERT_THRESHOLD = 7;

export interface SatelliteRiskInput {
  vesselCount: number;
  clusterFlag: boolean;
  pollutionFlag: boolean;
  nearCoral: boolean;
  marineProtectedAreaFlag: boolean;
}

export function satelliteRiskScore(input: SatelliteRiskInput): number {
  let score = 0;
  score += Math.min(input.vesselCount * 0.5, 3);
  if (input.clusterFlag) score += 2;
  if (input.pollutionFlag) score += 2.5;
  if (input.nearCoral) score += 1.5;
  if (input.marineProtectedAreaFlag) score += 3;
  return Math.min(score, MODULE_RISK_MAX);
}

export function coralRiskScore(bleachingProbability: number, thermalStress: number): number {
  return Math.min(bleachingProbability * 0.6 + thermalStress * 0.4, MODULE_RISK_MAX);
}

export function isSatelliteHighRisk(riskScore: number): boolean {
  return riskScore >= SATELLITE_HIGH_RISK_THRESHOLD;
}

export function isCoralAlert(riskScore: number): boolean {
  return riskScore >= CORAL_ALERT_THRESHOLD;
}

export function isAisAlert(riskScore: number): boolean {
  return riskScore >= AIS_ALERT_THRESHOLD;
}

export function isIotAlert(riskScore: number): boolean {
  return riskScore >= IOT_ALERT_THRESHOLD;
}

export interface IotSensorValues {
  temperature: number;
  ph: number;
  turbidity: number;
  oxygen: number;
}

// The IoT module's buoy rule: +3 above 30 degC, +2 outside pH 7.8-8.3,
// +2.5 above 30 turbidity units, +2.5 below 6 mg/L dissolved oxygen; capped at 10.
export function iotRiskScore({ temperature, ph, turbidity, oxygen }: IotSensorValues): number {
  let risk = 0;
  if (temperature > 30) risk += 3;
  if (ph < 7.8 || ph > 8.3) risk += 2;
  if (turbidity > 30) risk += 2.5;
  if (oxygen < 6) risk += 2.5;
  return Math.min(risk, MODULE_RISK_MAX);
}

export function averageRisk(records: ReadonlyArray<{ riskScore: number }>): number {
  if (records.length === 0) return 0;
  return records.reduce((sum, r) => sum + r.riskScore, 0) / records.length;
}

export type ModuleSeverityBand = 'Critical' | 'Elevated' | 'Normal';

// Band for a 0-10 module-scale score (Command Center global index).
export function moduleSeverityBand(score: number): ModuleSeverityBand {
  if (score >= 7) return 'Critical';
  if (score >= 4) return 'Elevated';
  return 'Normal';
}

export type VesselRiskBand = 'Critical' | 'High' | 'Moderate' | 'Low';

// Band for a 0-1 vessel risk score (Live Ocean Map).
export function vesselRiskBand(score: number): VesselRiskBand {
  if (score >= 0.75) return 'Critical';
  if (score >= 0.5) return 'High';
  if (score >= 0.25) return 'Moderate';
  return 'Low';
}
