// State transitions behind the Coral module's buttons, as pure functions.
import { describe, expect, it } from 'vitest';
import {
  changeRegion,
  coralSavePayload,
  initialCoralForm,
  loadCrwReading,
  setSimulatedReading,
  sourceLabel,
} from './coralForm';
import { CRW_EXTRACT } from './crwReading';

const crwLabel = `NOAA CRW, data from ${CRW_EXTRACT.date}`;

describe('Load NOAA CRW Reading button', () => {
  it('fills the Florida Keys values and labels the source', () => {
    const form = loadCrwReading(changeRegion(initialCoralForm(), 'florida_keys'));
    expect(form).toMatchObject({ regionId: 'florida_keys', bleaching: '10.0', thermalStress: '10.0' });
    expect(sourceLabel(form.source)).toBe(crwLabel);
  });

  it('fills the Hawaii values from its nearest water cell', () => {
    const form = loadCrwReading(changeRegion(initialCoralForm(), 'hawaii'));
    expect(form).toMatchObject({ bleaching: '2.5', thermalStress: '0.0' });
    expect(form.source).toMatchObject({ kind: 'crw', regionId: 'hawaii' });
  });

  it('leaves the form unchanged for a region missing from the extract', () => {
    const before = changeRegion(initialCoralForm(), 'atlantis');
    expect(loadCrwReading(before)).toBe(before);
  });
});

// Found in the browser: after loading Florida Keys and switching to Hawaii, the
// form kept Florida's 10.0 / 10.0 under a "NOAA CRW" badge and saved them as
// Hawaii's reading with an alert.
describe('changing region after loading a CRW reading', () => {
  const floridaThenHawaii = () => changeRegion(loadCrwReading(changeRegion(initialCoralForm(), 'florida_keys')), 'hawaii');

  it("drops the previous region's CRW values and label", () => {
    const form = floridaThenHawaii();
    expect(form).toMatchObject({ regionId: 'hawaii', bleaching: '0', thermalStress: '0' });
    expect(sourceLabel(form.source)).toBe('Manual entry');
  });

  it("does not save another region's CRW reading", () => {
    const payload = coralSavePayload(floridaThenHawaii(), 'Hawaii – Central Pacific Ocean', null);
    expect(payload).toMatchObject({ dataType: 'Manual entry', riskScore: 0, alertStatus: false });
  });

  it('keeps the same region when re-selected', () => {
    const loaded = loadCrwReading(changeRegion(initialCoralForm(), 'florida_keys'));
    expect(changeRegion(loaded, 'florida_keys')).toBe(loaded);
  });

  it('keeps simulated image values, which are not tied to a region', () => {
    const form = changeRegion(setSimulatedReading(initialCoralForm(), '4.2', '7.1'), 'hawaii');
    expect(form).toMatchObject({ bleaching: '4.2', thermalStress: '7.1' });
    expect(sourceLabel(form.source)).toBe('Simulated');
  });
});

describe('coralSavePayload', () => {
  it('saves a loaded CRW reading with its dated dataType and alert flag', () => {
    const form = loadCrwReading(changeRegion(initialCoralForm(), 'florida_keys'));
    expect(coralSavePayload(form, 'Florida Keys – United States', null)).toEqual({
      imageId: null,
      bleachingProbability: 10,
      thermalStress: 10,
      riskScore: 10,
      alertStatus: true,
      region: 'Florida Keys – United States',
      dataType: `NOAA CRW ${CRW_EXTRACT.date}`,
    });
  });

  it('labels simulated image readings', () => {
    const form = setSimulatedReading(initialCoralForm(), '1.0', '2.0');
    expect(coralSavePayload(form, 'x', 'reef.jpg')).toMatchObject({ dataType: 'Simulated image', imageId: 'reef.jpg' });
  });
});
