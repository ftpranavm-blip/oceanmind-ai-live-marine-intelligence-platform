// AIS module form state and the transitions behind its inputs and buttons, as
// pure functions so they can be tested without a browser DOM. Any input change
// clears the previous analysis, so results never outlive their input.
import { analyzeAis, checkUploadSize, type AisAnalysis } from './ais';
import { isAisAlert } from './risk';

export interface AisFileInfo {
  name: string;
  size: number;
  /** The anonymised MarineCadastre sample bundled with the app. */
  sample?: boolean;
}

export const AIS_SAMPLE_FILE: AisFileInfo = { name: 'ais-sample-2026-06-30.csv', size: 111_743, sample: true };

export type AisSource = { kind: 'manual' } | { kind: 'simulated' } | { kind: 'file'; label: string };

export interface AisForm {
  file: AisFileInfo | null;
  error: string | null;
  analysis: AisAnalysis | null;
  region: string;
  vesselIDs: string;
  riskScore: string;
  source: AisSource;
}

export function initialAisForm(): AisForm {
  return { file: null, error: null, analysis: null, region: 'Global Waters', vesselIDs: '', riskScore: '0', source: { kind: 'manual' } };
}

const clearResults = (form: AisForm): AisForm => ({ ...form, error: null, analysis: null, riskScore: '0', vesselIDs: '', source: { kind: 'manual' } });

export function selectFile(form: AisForm, file: AisFileInfo): AisForm {
  const cleared = clearResults(form);
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { ...cleared, file: null, error: 'Please choose a .csv file (MarineCadastre day files must be decompressed first).' };
  }
  const tooBig = checkUploadSize(file.size);
  if (tooBig) return { ...cleared, file: null, error: tooBig };
  return { ...cleared, file };
}

function dateLabel(dates: AisAnalysis['dates']): string {
  if (!dates) return 'no dated rows';
  return dates.first === dates.last ? `data from ${dates.first}` : `data from ${dates.first} to ${dates.last}`;
}

// "Analyze AIS Data": runs the rules on the selected file's text.
export function analyzeFile(form: AisForm, text: string): AisForm {
  if (!form.file) return form;
  let analysis: AisAnalysis;
  try {
    analysis = analyzeAis(text);
  } catch (e) {
    return { ...clearResults(form), error: e instanceof Error ? e.message : String(e) };
  }
  const origin = form.file.sample ? 'MarineCadastre AIS sample (derived, anonymised)' : 'Uploaded AIS CSV';
  return {
    ...form,
    error: null,
    analysis,
    riskScore: analysis.riskScore.toFixed(1),
    vesselIDs: analysis.flagged.map(v => v.id).join(', '),
    source: { kind: 'file', label: `${origin}, ${dateLabel(analysis.dates)}` },
  };
}

export function setSimulatedReading(form: AisForm, riskScore: string, vesselIDs: string): AisForm {
  return { ...clearResults(form), riskScore, vesselIDs, source: { kind: 'simulated' } };
}

export function editRegion(form: AisForm, region: string): AisForm {
  return { ...clearResults(form), region };
}

export function editVesselIDs(form: AisForm, vesselIDs: string): AisForm {
  return { ...clearResults(form), vesselIDs };
}

export function editRisk(form: AisForm, riskScore: string): AisForm {
  return { ...clearResults(form), riskScore };
}

export function aisSourceLabel(source: AisSource): string {
  if (source.kind === 'file') return source.label;
  return source.kind === 'simulated' ? 'Simulated' : 'Manual entry';
}

// Null when there is no vessel ID to save.
export function aisSavePayload(form: AisForm) {
  const vesselIDs = form.vesselIDs.split(',').map(id => id.trim()).filter(id => id.length > 0);
  if (vesselIDs.length === 0) return null;
  const riskScore = parseFloat(form.riskScore) || 0;
  return {
    dataModule: `AIS Intelligence (${aisSourceLabel(form.source)})`,
    region: form.region,
    vesselIDs,
    riskScore,
    alertStatus: isAisAlert(riskScore),
  };
}
