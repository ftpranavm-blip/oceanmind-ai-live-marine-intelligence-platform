// State transitions behind the AIS module's inputs and buttons, as pure functions.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_AIS_UPLOAD_BYTES } from './ais';
import {
  AIS_SAMPLE_FILE,
  aisSavePayload,
  aisSourceLabel,
  analyzeFile,
  editRegion,
  editRisk,
  editVesselIDs,
  initialAisForm,
  selectFile,
  setSimulatedReading,
} from './aisForm';

const sample = readFileSync(new URL('../data/ais-sample-2026-06-30.csv', import.meta.url), 'utf8');
const SNAKE = 'mmsi,base_date_time,longitude,latitude,sog,cog,heading,vessel_type,status';
const twoDays = `${SNAKE}\nA,2026-06-30 23:50:00,-81.8,24.55,5,,,30,0\nA,2026-07-01 00:10:00,-81.79,24.55,5,,,30,0\n`;

const analysedSample = () => analyzeFile(selectFile(initialAisForm(), AIS_SAMPLE_FILE), sample);
const analysedUpload = () => analyzeFile(selectFile(initialAisForm(), { name: 'florida.csv', size: sample.length }), sample);

describe('choosing a file', () => {
  it('refuses a file over 20 MB with a clear message and no analysis', () => {
    const form = selectFile(initialAisForm(), { name: 'ais-2026-06-30.csv', size: 321_337_372 });
    expect(form.file).toBeNull();
    expect(form.error).toBe('This file is 306.5 MB; the limit is 20 MB. Filter the AIS day file to your area or a few vessels first.');
    expect(analyzeFile(form, sample)).toBe(form);
  });

  it('accepts a file of exactly 20 MB', () => {
    expect(selectFile(initialAisForm(), { name: 'a.csv', size: MAX_AIS_UPLOAD_BYTES }).error).toBeNull();
  });

  it('refuses a file that is not a CSV', () => {
    expect(selectFile(initialAisForm(), { name: 'ais-2026-06-30.csv.zst', size: 100 }).error).toBe(
      'Please choose a .csv file (MarineCadastre day files must be decompressed first).',
    );
  });

  it('shows the parser message for a CSV that is not AIS', () => {
    const form = analyzeFile(selectFile(initialAisForm(), { name: 'sensors.csv', size: 20 }), 'Timestamp,Temperature\n1,2\n');
    expect(form.analysis).toBeNull();
    expect(form.error).toMatch(/^Not a MarineCadastre AIS CSV: missing columns: mmsi, base_date_time/);
  });
});

describe('Analyze AIS Data button', () => {
  it('scores the sample and labels it with the data date', () => {
    const form = analysedSample();
    expect(form.riskScore).toBe('7.0');
    expect(aisSourceLabel(form.source)).toBe('MarineCadastre AIS sample (derived, anonymised), data from 2026-06-30');
    expect(form.vesselIDs.split(', ')).toEqual(form.analysis!.flagged.map(v => v.id));
  });

  it('does not claim an uploaded file is from MarineCadastre', () => {
    expect(aisSourceLabel(analysedUpload().source)).toBe('Uploaded AIS CSV, data from 2026-06-30');
  });

  it('shows a date range when the file spans days', () => {
    const form = analyzeFile(selectFile(initialAisForm(), { name: 'two.csv', size: twoDays.length }), twoDays);
    expect(aisSourceLabel(form.source)).toBe('Uploaded AIS CSV, data from 2026-06-30 to 2026-07-01');
  });
});

// The coral bug: results must never outlive the input they were computed from.
describe('every input change clears the results', () => {
  const cleared = { analysis: null, riskScore: '0', vesselIDs: '', source: { kind: 'manual' } };

  it('choosing another file', () => {
    expect(selectFile(analysedSample(), { name: 'other.csv', size: 10 })).toMatchObject({ ...cleared, file: { name: 'other.csv' } });
  });

  it('a refused file', () => {
    expect(selectFile(analysedSample(), { name: 'big.csv', size: MAX_AIS_UPLOAD_BYTES + 1 })).toMatchObject({ ...cleared, file: null });
  });

  it('editing the region', () => {
    expect(editRegion(analysedSample(), 'Florida Keys')).toMatchObject({ ...cleared, region: 'Florida Keys' });
  });

  it('editing the vessel IDs', () => {
    expect(editVesselIDs(analysedSample(), 'VESSEL-001')).toMatchObject({ ...cleared, vesselIDs: 'VESSEL-001' });
  });

  it('editing the risk score', () => {
    expect(editRisk(analysedSample(), '9')).toMatchObject({ ...cleared, riskScore: '9' });
  });

  it('generating a simulated reading', () => {
    const form = setSimulatedReading(analysedSample(), '4.2', 'MMSI-1, IMO-2');
    expect(form).toMatchObject({ analysis: null, riskScore: '4.2', vesselIDs: 'MMSI-1, IMO-2' });
    expect(aisSourceLabel(form.source)).toBe('Simulated');
  });
});

describe('aisSavePayload', () => {
  it('saves flagged vessels, the score and the alert flag, with the source in dataModule', () => {
    const payload = aisSavePayload(editRegionKeepingResults(analysedSample(), 'Florida Keys'))!;
    expect(payload).toMatchObject({ region: 'Florida Keys', riskScore: 7, alertStatus: true });
    expect(payload.vesselIDs.length).toBeGreaterThan(0);
    expect(payload.dataModule).toBe('AIS Intelligence (MarineCadastre AIS sample (derived, anonymised), data from 2026-06-30)');
  });

  it('refuses to save without a vessel ID', () => {
    expect(aisSavePayload(initialAisForm())).toBeNull();
  });
});

// Region is set before analysing in the page; this helper mirrors that order.
function editRegionKeepingResults(form: ReturnType<typeof initialAisForm>, region: string) {
  return { ...form, region };
}
