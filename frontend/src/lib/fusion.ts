// Pure fusion-engine logic: global risk indices, correlation rules and
// recommendation scenario selection. No React, no backend calls.
import { averageRisk, moduleRiskPercent, moduleSeverityBand, vesselRiskOnModuleScale, type ModuleSeverityBand } from './risk';

// All indices and thresholds below are on the 0-10 module scale. Vessel risk
// (0-1) is converted with vesselRiskOnModuleScale before it is combined.

export interface FusionSatelliteRecord {
  riskScore: number;
  clusterFlag: boolean;
  pollutionFlag: boolean;
  marina_area_flag: boolean;
  vesselCount: bigint | number;
}

export interface FusionCoralRecord {
  riskScore: number;
  thermalStress: number;
  bleachingProbability: number;
}

export interface FusionAISRecord {
  riskScore: number;
}

export interface FusionIoTRecord {
  riskScore: number;
  dataType: string;
}

export interface FusionVesselRecord {
  riskScore: number;
}

export interface FusionInputs {
  satellite: ReadonlyArray<FusionSatelliteRecord>;
  coral: ReadonlyArray<FusionCoralRecord>;
  ais: ReadonlyArray<FusionAISRecord>;
  iot: ReadonlyArray<FusionIoTRecord>;
  vessels: ReadonlyArray<FusionVesselRecord>;
}

export interface ModuleRiskAverages {
  satellite: number;
  coral: number;
  ais: number;
  iot: number;
  /** Average vessel risk on its native 0-1 scale. */
  vessel: number;
}

export function moduleRiskAverages(inputs: FusionInputs): ModuleRiskAverages {
  return {
    satellite: averageRisk(inputs.satellite),
    coral: averageRisk(inputs.coral),
    ais: averageRisk(inputs.ais),
    iot: averageRisk(inputs.iot),
    vessel: averageRisk(inputs.vessels),
  };
}

// Weighted sum of module averages; use globalMarineRiskIndex from pages.
export function weightedGlobalRiskIndex(avg: ModuleRiskAverages): number {
  return (
    avg.satellite * 0.25 +
    avg.coral * 0.2 +
    avg.ais * 0.25 +
    avg.iot * 0.15 +
    vesselRiskOnModuleScale(avg.vessel) * 0.15
  );
}

// The "Global Marine Risk Index" shown on every page (0-10).
export function globalMarineRiskIndex(inputs: FusionInputs): number {
  return weightedGlobalRiskIndex(moduleRiskAverages(inputs));
}

export function fusionRiskScore(avg: ModuleRiskAverages): number {
  const vessel = vesselRiskOnModuleScale(avg.vessel);
  return Math.min((avg.satellite + avg.coral + avg.ais + avg.iot + vessel) / 5, 10);
}

export type FusionIndexBand = ModuleSeverityBand;

export function fusionIndexBand(index: number): FusionIndexBand {
  return moduleSeverityBand(index);
}

// Percentage (0-100) for the index progress bar.
export function fusionIndexPercent(index: number): number {
  return moduleRiskPercent(index);
}

// Record filters used by the correlation rules and the correlation matrix.
// Vessel risk stays on its 0-1 scale here.
export const isHighRiskAIS = (d: FusionAISRecord) => d.riskScore > 7;
export const isCoralEmergency = (d: FusionCoralRecord) => d.riskScore > 6 && d.thermalStress > 6;
export const isHighRiskIoT = (d: FusionIoTRecord) => d.riskScore > 6;
export const isCoralBleaching = (d: FusionCoralRecord) => d.bleachingProbability > 6;
export const isHighThermalStress = (d: FusionCoralRecord) => d.thermalStress > 7;
export const isTurbidityAnomaly = (d: FusionIoTRecord) =>
  d.dataType.toLowerCase().includes('turbidity') && d.riskScore > 6;
export const isHighRiskVessel = (v: FusionVesselRecord) => v.riskScore > 0.5;
export const isMpaViolation = (d: FusionSatelliteRecord) => d.marina_area_flag && Number(d.vesselCount) > 5;

export type CorrelationStatus = 'normal' | 'warning' | 'critical';

// Display label for the AIS + satellite correlation. Its stored identifiers
// (correlationType 'illegal_fishing', alert ids fusion_illegal_fishing_*) are
// unchanged; the rules flag vessel behaviour to review, not wrongdoing.
export const SUSPICIOUS_VESSEL_ACTIVITY = 'Suspicious vessel activity (AIS + satellite)';

export interface CorrelationMetric {
  /** Stable key, used when saving snapshots; the name is display text only. */
  key: CorrelationType;
  name: string;
  value: number;
  threshold: number;
  status: CorrelationStatus;
}

export type CorrelationType =
  | 'illegal_fishing'
  | 'reef_emergency'
  | 'pollution_correlation'
  | 'mpa_violation'
  | 'vessel_coral_impact'
  | 'climate_pollution';

export interface FusionAlert {
  id: string;
  type: string;
  severity: number;
  description: string;
  sources: string[];
  timestamp: number;
  correlationType: CorrelationType;
}

function correlationStatus(value: number, warning: number, critical: number): CorrelationStatus {
  if (value >= critical) return 'critical';
  if (value >= warning) return 'warning';
  return 'normal';
}

export interface CorrelationResult {
  metrics: CorrelationMetric[];
  alerts: FusionAlert[];
}

export function computeCorrelations(inputs: FusionInputs, now: number): CorrelationResult {
  const { satellite, coral, ais, iot, vessels } = inputs;
  const metrics: CorrelationMetric[] = [];
  const alerts: FusionAlert[] = [];

  // Correlation 1: Suspicious vessel activity (AIS + Satellite)
  const highAIS = ais.filter(isHighRiskAIS);
  const satelliteClusters = satellite.filter(d => d.clusterFlag);
  const illegalFishing = (highAIS.length + satelliteClusters.length) / 2;
  metrics.push({ key: 'illegal_fishing', name: SUSPICIOUS_VESSEL_ACTIVITY, value: illegalFishing, threshold: 3, status: correlationStatus(illegalFishing, 3, 5) });
  if (highAIS.length > 0 && satelliteClusters.length > 0) {
    alerts.push({
      id: `fusion_illegal_fishing_${now}`,
      type: SUSPICIOUS_VESSEL_ACTIVITY,
      severity: 9,
      description: `High AIS risk (${highAIS.length} vessels) combined with satellite vessel clustering (${satelliteClusters.length} clusters) detected`,
      sources: ['AIS Intelligence', 'Satellite Intelligence'],
      timestamp: now,
      correlationType: 'illegal_fishing',
    });
  }

  // Correlation 2: Reef Emergency (Coral + Temperature)
  const highCoralRisk = coral.filter(isCoralEmergency);
  const reefEmergency = highCoralRisk.length;
  metrics.push({ key: 'reef_emergency', name: 'Reef Emergency Risk', value: reefEmergency, threshold: 2, status: correlationStatus(reefEmergency, 2, 4) });
  if (highCoralRisk.length > 0) {
    alerts.push({
      id: `fusion_reef_emergency_${now}`,
      type: 'Reef Emergency',
      severity: 8,
      description: `Critical coral bleaching risk detected in ${highCoralRisk.length} regions with elevated thermal stress`,
      sources: ['Coral Intelligence', 'NOAA Temperature Data'],
      timestamp: now,
      correlationType: 'reef_emergency',
    });
  }

  // Correlation 3: Pollution Detection (Satellite + IoT)
  const pollutionDetected = satellite.filter(d => d.pollutionFlag);
  const highIoTRisk = iot.filter(isHighRiskIoT);
  const pollution = (pollutionDetected.length + highIoTRisk.length) / 2;
  metrics.push({ key: 'pollution_correlation', name: 'Pollution Risk', value: pollution, threshold: 2, status: correlationStatus(pollution, 2, 4) });
  if (pollutionDetected.length > 0 && highIoTRisk.length > 0) {
    alerts.push({
      id: `fusion_pollution_${now}`,
      type: 'Pollution Correlation',
      severity: 7,
      description: `Satellite pollution patterns (${pollutionDetected.length} areas) confirmed by IoT sensor anomalies (${highIoTRisk.length} sensors)`,
      sources: ['Satellite Intelligence', 'IoT Sensors'],
      timestamp: now,
      correlationType: 'pollution_correlation',
    });
  }

  // Correlation 4: MPA Violation (Satellite + Vessel Density)
  const mpaViolations = satellite.filter(isMpaViolation);
  const mpa = mpaViolations.length;
  metrics.push({ key: 'mpa_violation', name: 'MPA Violation Risk', value: mpa, threshold: 1, status: correlationStatus(mpa, 1, 3) });
  if (mpaViolations.length > 0) {
    alerts.push({
      id: `fusion_mpa_violation_${now}`,
      type: 'MPA Violation',
      severity: 9,
      description: `Multiple vessels detected inside Marine Protected Areas (${mpaViolations.length} violations)`,
      sources: ['Satellite Intelligence', 'Live Ocean Map'],
      timestamp: now,
      correlationType: 'mpa_violation',
    });
  }

  // Correlation 5: Vessel Density + Coral Bleaching
  const highVesselDensity = vessels.filter(isHighRiskVessel).length;
  const coralBleachingAreas = coral.filter(isCoralBleaching).length;
  const vesselCoral = (highVesselDensity + coralBleachingAreas) / 2;
  metrics.push({ key: 'vessel_coral_impact', name: 'Vessel-Coral Impact', value: vesselCoral, threshold: 3, status: correlationStatus(vesselCoral, 3, 5) });
  if (highVesselDensity > 2 && coralBleachingAreas > 0) {
    alerts.push({
      id: `fusion_vessel_coral_${now}`,
      type: 'Vessel-Coral Impact',
      severity: 7,
      description: `High vessel density (${highVesselDensity} vessels) near coral bleaching zones (${coralBleachingAreas} areas)`,
      sources: ['Live Ocean Map', 'Coral Intelligence'],
      timestamp: now,
      correlationType: 'vessel_coral_impact',
    });
  }

  // Correlation 6: SST + Pollution Indicators
  const highThermalStress = coral.filter(isHighThermalStress).length;
  const pollutionIndicators = iot.filter(isTurbidityAnomaly).length;
  const sstPollution = (highThermalStress + pollutionIndicators) / 2;
  metrics.push({ key: 'climate_pollution', name: 'SST-Pollution Correlation', value: sstPollution, threshold: 2, status: correlationStatus(sstPollution, 2, 4) });
  if (highThermalStress > 0 && pollutionIndicators > 0) {
    alerts.push({
      id: `fusion_sst_pollution_${now}`,
      type: 'Climate-Pollution',
      severity: 8,
      description: `Elevated sea surface temperature (${highThermalStress} areas) combined with pollution indicators (${pollutionIndicators} sensors)`,
      sources: ['Coral Intelligence', 'IoT Sensors'],
      timestamp: now,
      correlationType: 'climate_pollution',
    });
  }

  return { metrics, alerts };
}

// Numeric fields of a saved fusion snapshot (FusionCorrelations in the
// backend), looked up by metric key so renaming a label cannot zero a field.
export function correlationsFromMetrics(metrics: ReadonlyArray<CorrelationMetric>) {
  const value = (key: CorrelationType) => metrics.find(m => m.key === key)?.value ?? 0;
  return {
    satelliteAIS: value('illegal_fishing'),
    satelliteCoral: value('reef_emergency'),
    iotCoral: value('climate_pollution'),
    coralAIS: 0,
    mapAIS: value('mpa_violation'),
    iotAIS: value('pollution_correlation'),
    mapCoral: value('vessel_coral_impact'),
    mapIot: 0,
    iotSatellite: 0,
  };
}

export type RecommendationScenario =
  | 'illegal_fishing'
  | 'reef_emergency'
  | 'pollution'
  | 'mpa_violation'
  | 'elevated'
  | 'normal';

// Picks which recommendation playbook applies, in priority order.
export function selectRecommendationScenario(
  alerts: ReadonlyArray<Pick<FusionAlert, 'correlationType'>>,
  globalRiskIndex: number,
): RecommendationScenario {
  const has = (t: CorrelationType) => alerts.some(a => a.correlationType === t);
  if (has('illegal_fishing')) return 'illegal_fishing';
  if (has('reef_emergency')) return 'reef_emergency';
  if (has('pollution_correlation')) return 'pollution';
  if (has('mpa_violation')) return 'mpa_violation';
  if (globalRiskIndex > 5) return 'elevated';
  return 'normal';
}

export function shouldGenerateRecommendations(alertCount: number, globalRiskIndex: number): boolean {
  return alertCount > 0 || globalRiskIndex > 3;
}

export function confidenceIndicator(score: number): 'High' | 'Medium' | 'Low' {
  if (score >= 0.85) return 'High';
  if (score >= 0.7) return 'Medium';
  return 'Low';
}
