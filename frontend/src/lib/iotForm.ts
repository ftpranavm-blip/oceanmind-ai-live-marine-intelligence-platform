// IoT module form state and the transitions behind its buttons, as pure
// functions so they can be tested without a browser DOM.
import extractJson from '../data/ndbc-extract.json';
import { IOT_STATIONS } from './iotStations';
import { ndbcSourceLabel, type IotVariable, type NdbcExtract, type NdbcLocation } from './ndbc';
import { iotRiskScore, isIotAlert } from './risk';

export const NDBC_EXTRACT = extractJson as NdbcExtract;

export interface IotSensor {
  temperature: string;
  ph: string;
  turbidity: string;
  oxygen: string;
}

export type IotSource =
  | { kind: 'manual' }
  | { kind: 'simulated' }
  | { kind: 'ndbc'; locationId: string; label: string; dataType: string };

export interface IotForm {
  locationId: string;
  sensor: IotSensor;
  riskScore: string;
  source: IotSource;
}

const EMPTY_SENSOR: IotSensor = { temperature: '0', ph: '0', turbidity: '0', oxygen: '0' };
const SAMPLE_NAMES: [IotVariable, string][] = [['ph', 'pH'], ['oxygen', 'oxygen'], ['turbidity', 'turbidity']];

export function initialIotForm(locationId = 'pacific-buoy-1'): IotForm {
  return { locationId, sensor: { ...EMPTY_SENSOR }, riskScore: '0', source: { kind: 'manual' } };
}

export function stationFor(locationId: string) {
  return IOT_STATIONS.find(s => s.id === locationId);
}

// The bundled reading for a location, with a label that names any sample values.
export function ndbcReadingForLocation(locationId: string, extract: NdbcExtract = NDBC_EXTRACT) {
  const location: NdbcLocation | undefined = extract.locations[locationId];
  if (!location) return null;
  const { temperature } = location.readings;
  const time = temperature.source === 'ndbc' ? temperature.time : extract.retrieved;
  const samples = SAMPLE_NAMES.filter(([v]) => location.readings[v].source === 'sample').map(([, name]) => name);
  const suffix = samples.length ? ` + sample ${samples.join(', ')}` : '';
  return {
    location,
    label: ndbcSourceLabel(location.station, time) + suffix,
    dataType: `NOAA NDBC ${location.station} ${time.slice(0, 10)}${samples.length ? ' + sample values' : ''}`,
  };
}

export function iotSourceLabel(source: IotSource): string {
  if (source.kind === 'ndbc') return source.label;
  return source.kind === 'simulated' ? 'Simulated' : 'Manual entry';
}

function sourceDataType(source: IotSource): string {
  if (source.kind === 'ndbc') return source.dataType;
  return source.kind === 'simulated' ? 'Simulated' : 'Manual entry';
}

// "Load NDBC Reading": fills the sensor values and risk from the bundled extract.
export function loadNdbcReading(form: IotForm): IotForm {
  const reading = ndbcReadingForLocation(form.locationId);
  if (!reading) return form;
  const r = reading.location.readings;
  const sensor: IotSensor = {
    temperature: String(r.temperature.value),
    ph: String(r.ph.value),
    turbidity: String(r.turbidity.value),
    oxygen: String(r.oxygen.value),
  };
  const risk = iotRiskScore({ temperature: r.temperature.value, ph: r.ph.value, turbidity: r.turbidity.value, oxygen: r.oxygen.value });
  return {
    ...form,
    sensor,
    riskScore: risk.toFixed(1),
    source: { kind: 'ndbc', locationId: form.locationId, label: reading.label, dataType: reading.dataType },
  };
}

// A station reading belongs to one location, so switching location drops it.
export function changeLocation(form: IotForm, locationId: string): IotForm {
  if (locationId === form.locationId) return form;
  if (form.source.kind === 'ndbc') return initialIotForm(locationId);
  return { ...form, locationId };
}

export function setSimulatedReading(form: IotForm, sensor: IotSensor, riskScore: string): IotForm {
  return { ...form, sensor, riskScore, source: { kind: 'simulated' } };
}

export function editRisk(form: IotForm, riskScore: string): IotForm {
  return { ...form, riskScore, source: { kind: 'manual' } };
}

// Which parameter drives the reading (same order the module used before).
export function iotPrimaryParameter(sensor: IotSensor): string {
  const n = (v: string) => parseFloat(v);
  if (n(sensor.ph) < 7.8 || n(sensor.ph) > 8.3) return 'pH';
  if (n(sensor.turbidity) > 30) return 'turbidity';
  if (n(sensor.oxygen) < 6) return 'oxygen';
  return 'temperature';
}

export function iotSavePayload(form: IotForm) {
  const riskScore = parseFloat(form.riskScore) || 0;
  return {
    dataModule: 'IoT Intelligence',
    region: stationFor(form.locationId)?.label ?? 'Unknown Region',
    dataType: `${iotPrimaryParameter(form.sensor)} (${sourceDataType(form.source)})`,
    riskScore,
    alertStatus: isIotAlert(riskScore),
  };
}
