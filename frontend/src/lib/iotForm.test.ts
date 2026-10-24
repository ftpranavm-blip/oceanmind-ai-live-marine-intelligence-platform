// State transitions behind the IoT module's buttons, as pure functions.
import { describe, expect, it } from 'vitest';
import { changeLocation, editRisk, initialIotForm, iotSavePayload, iotSourceLabel, loadNdbcReading } from './iotForm';
import { iotRiskScore } from './risk';
import extract from '../data/ndbc-extract.json';

describe('iotRiskScore (the module\'s existing buoy rule)', () => {
  it('adds 3 above 30 degC, 2 outside pH 7.8-8.3, 2.5 above 30 FTU turbidity, 2.5 below 6 mg/L oxygen', () => {
    expect(iotRiskScore({ temperature: 30, ph: 7.8, turbidity: 30, oxygen: 6 })).toBe(0);
    expect(iotRiskScore({ temperature: 30.1, ph: 8.05, turbidity: 1, oxygen: 7 })).toBe(3);
    expect(iotRiskScore({ temperature: 20, ph: 7.6, turbidity: 1, oxygen: 8 })).toBe(2);
    expect(iotRiskScore({ temperature: 20, ph: 8.4, turbidity: 31, oxygen: 5 })).toBe(7);
  });

  it('caps at 10', () => {
    expect(iotRiskScore({ temperature: 35, ph: 6, turbidity: 90, oxygen: 1 })).toBe(10);
  });
});

describe('Load NDBC Reading button', () => {
  it("fills the Caribbean station's measured values and risk", () => {
    const form = loadNdbcReading(initialIotForm('caribbean-buoy-3'));
    const r = extract.locations['caribbean-buoy-3'].readings;
    expect(form.sensor).toEqual({
      temperature: String(r.temperature.value),
      ph: String(r.ph.value),
      turbidity: String(r.turbidity.value),
      oxygen: String(r.oxygen.value),
    });
    expect(form.riskScore).toBe(
      iotRiskScore({ temperature: r.temperature.value, ph: r.ph.value, turbidity: r.turbidity.value, oxygen: r.oxygen.value }).toFixed(1),
    );
    expect(iotSourceLabel(form.source)).toBe(`NOAA NDBC JOBP4, data from ${r.temperature.time.slice(0, 10)}`);
  });

  it('says which values are samples at a temperature-only station', () => {
    const form = loadNdbcReading(initialIotForm('atlantic-buoy-2'));
    expect(iotSourceLabel(form.source)).toMatch(/^NOAA NDBC 41049, data from \d{4}-\d{2}-\d{2} \+ sample pH, oxygen, turbidity$/);
  });
});

describe('changing location after loading an NDBC reading', () => {
  const caribbeanThenPacific = () => changeLocation(loadNdbcReading(initialIotForm('caribbean-buoy-3')), 'pacific-buoy-1');

  it("drops the previous station's values and label", () => {
    const form = caribbeanThenPacific();
    expect(form).toMatchObject({ locationId: 'pacific-buoy-1', riskScore: '0' });
    expect(form.sensor).toEqual({ temperature: '0', ph: '0', turbidity: '0', oxygen: '0' });
    expect(iotSourceLabel(form.source)).toBe('Manual entry');
  });

  it("does not save another station's reading", () => {
    expect(iotSavePayload(caribbeanThenPacific())).toMatchObject({ riskScore: 0, alertStatus: false });
    expect(iotSavePayload(caribbeanThenPacific()).dataType).toMatch(/Manual entry/);
  });
});

describe('iotSavePayload', () => {
  it('saves the station label as region and the source in dataType', () => {
    const form = loadNdbcReading(initialIotForm('caribbean-buoy-3'));
    const payload = iotSavePayload(form);
    expect(payload.region).toBe('Caribbean – Jobos Bay Reserve, Puerto Rico (NDBC JOBP4)');
    expect(payload.dataType).toContain('NOAA NDBC JOBP4');
    expect(payload.alertStatus).toBe(payload.riskScore >= 7);
  });

  it('treats an edited risk score as manual entry', () => {
    const form = editRisk(loadNdbcReading(initialIotForm('caribbean-buoy-3')), '9');
    expect(iotSourceLabel(form.source)).toBe('Manual entry');
    expect(iotSavePayload(form)).toMatchObject({ riskScore: 9, alertStatus: true });
  });
});
