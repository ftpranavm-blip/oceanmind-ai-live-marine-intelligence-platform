// Coral module form state and the transitions behind its buttons, as pure
// functions so they can be tested without a browser DOM.
import { crwReadingForRegion, type CoralReadingFromCrw } from './crwReading';
import { coralRiskScore, isCoralAlert } from './risk';

// Where the values in the form came from; shown next to the score and saved as dataType.
export type CoralSource =
  | { kind: 'manual' }
  | { kind: 'simulated' }
  | { kind: 'crw'; regionId: string; crw: CoralReadingFromCrw };

export interface CoralForm {
  regionId: string;
  bleaching: string;
  thermalStress: string;
  source: CoralSource;
}

export function initialCoralForm(regionId = 'great_barrier_reef'): CoralForm {
  return { regionId, bleaching: '0', thermalStress: '0', source: { kind: 'manual' } };
}

export function sourceLabel(source: CoralSource): string {
  if (source.kind === 'crw') return source.crw.label;
  return source.kind === 'simulated' ? 'Simulated' : 'Manual entry';
}

export function sourceDataType(source: CoralSource): string {
  if (source.kind === 'crw') return source.crw.dataType;
  return source.kind === 'simulated' ? 'Simulated image' : 'Manual entry';
}

// A CRW reading belongs to one region, so switching region drops it; otherwise
// the old region's values would be shown and saved under the new region.
export function changeRegion(form: CoralForm, regionId: string): CoralForm {
  if (regionId === form.regionId) return form;
  if (form.source.kind === 'crw') return initialCoralForm(regionId);
  return { ...form, regionId };
}

// "Load NOAA CRW Reading": fills the inputs from the bundled extract for the selected region.
export function loadCrwReading(form: CoralForm): CoralForm {
  const crw = crwReadingForRegion(form.regionId);
  if (!crw) return form;
  return {
    ...form,
    bleaching: crw.bleaching.toFixed(1),
    thermalStress: crw.thermalStress.toFixed(1),
    source: { kind: 'crw', regionId: form.regionId, crw },
  };
}

export function setSimulatedReading(form: CoralForm, bleaching: string, thermalStress: string): CoralForm {
  return { ...form, bleaching, thermalStress, source: { kind: 'simulated' } };
}

// Typing in either input makes the values a manual entry.
export function editValue(form: CoralForm, field: 'bleaching' | 'thermalStress', value: string): CoralForm {
  return { ...form, [field]: value, source: { kind: 'manual' } };
}

export function coralRisk(form: CoralForm): number {
  return coralRiskScore(parseFloat(form.bleaching) || 0, parseFloat(form.thermalStress) || 0);
}

export function coralSavePayload(form: CoralForm, regionName: string, imageId: string | null) {
  const riskScore = coralRisk(form);
  return {
    imageId,
    bleachingProbability: parseFloat(form.bleaching) || 0,
    thermalStress: parseFloat(form.thermalStress) || 0,
    riskScore,
    alertStatus: isCoralAlert(riskScore),
    region: regionName,
    dataType: sourceDataType(form.source),
  };
}
