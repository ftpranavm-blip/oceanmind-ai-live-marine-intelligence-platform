// NOAA NDBC realtime2 parsing, tested against saved responses in
// __fixtures__/ndbc (first 4 KB of each file; no network).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  NDBC_COLUMNS,
  latestValue,
  ndbcSourceLabel,
  ndbcUrl,
  parseNdbcRealtime,
  parseSampleCsv,
} from './ndbc';
import { IOT_STATIONS } from './iotStations';
import extract from '../data/ndbc-extract.json';

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/ndbc/${name}`, import.meta.url), 'utf8');
const sampleCsv = readFileSync(new URL('../data/iot-sample.csv', import.meta.url), 'utf8');

describe('parseNdbcRealtime', () => {
  it('reads the column and unit rows of an .ocean file', () => {
    const t = parseNdbcRealtime(fixture('PPHH1.ocean'));
    expect(t.columns).toEqual(['YY', 'MM', 'DD', 'hh', 'mm', 'DEPTH', 'OTMP', 'COND', 'SAL', 'O2%', 'O2PPM', 'CLCON', 'TURB', 'PH', 'EH']);
    expect(t.units[t.columns.indexOf('OTMP')]).toBe('degC');
    expect(t.units[t.columns.indexOf('TURB')]).toBe('FTU');
  });

  it('reads the newest row with a UTC timestamp and turns MM into null', () => {
    const [row] = parseNdbcRealtime(fixture('PPHH1.ocean')).rows;
    expect(row.time).toBe('2026-10-22T18:15:00Z');
    expect(row.values).toMatchObject({ OTMP: 20.8, PH: 7.6, O2PPM: 8.8, TURB: 1, COND: null, SAL: null });
  });

  it('reads WTMP from a standard meteorological .txt file', () => {
    const [row] = parseNdbcRealtime(fixture('41049.txt')).rows;
    expect(row.time).toBe('2026-10-22T18:50:00Z');
    expect(row.values.WTMP).toBe(29.2);
  });

  it('drops a last line cut off by the 4 KB range request', () => {
    const text = fixture('41049.txt');
    expect(text.endsWith('\n')).toBe(false);
    const rows = parseNdbcRealtime(text).rows;
    const lastComplete = text.slice(0, text.lastIndexOf('\n')).split('\n').pop()!;
    expect(rows[rows.length - 1].time).toBe(parseNdbcRealtime(`${text.split('\n').slice(0, 2).join('\n')}\n${lastComplete}\n`).rows[0].time);
  });

  it('keeps the last line of a complete file (JOBP4 fits in one response)', () => {
    const text = fixture('JOBP4.ocean');
    expect(text.endsWith('\n')).toBe(true);
    const rows = parseNdbcRealtime(text).rows;
    expect(rows[rows.length - 1].time).toBe('2026-09-15T12:30:00Z');
  });

  it('accepts CRLF line endings', () => {
    expect(parseNdbcRealtime(fixture('JOBP4.ocean').replace(/\n/g, '\r\n')).rows[0].values.OTMP).toBe(30.8);
  });

  it('rejects text that is not an NDBC realtime file', () => {
    expect(() => parseNdbcRealtime('<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">\n<html><head>')).toThrow(/NDBC realtime/);
  });
});

describe('latestValue', () => {
  it('returns the newest non-missing value with its time', () => {
    expect(latestValue(parseNdbcRealtime(fixture('JOBP4.ocean')), 'O2PPM')).toEqual({ value: 3.7, time: '2026-10-21T15:30:00Z' });
  });

  it('returns null when a column is missing in every row (23019 has no WTMP)', () => {
    expect(latestValue(parseNdbcRealtime(fixture('23019.txt')), 'WTMP')).toBeNull();
  });

  it('returns null for a column the file does not have', () => {
    expect(latestValue(parseNdbcRealtime(fixture('41049.txt')), 'PH')).toBeNull();
  });

  it('finds the Indian Ocean temperature even though it is three weeks old', () => {
    expect(latestValue(parseNdbcRealtime(fixture('14049.txt')), 'WTMP')).toEqual({ value: 26.8, time: '2026-10-01T13:00:00Z' });
  });
});

describe('NDBC columns and URLs', () => {
  it('maps IoT variables to NDBC columns per file type', () => {
    expect(NDBC_COLUMNS.ocean).toEqual({ temperature: 'OTMP', ph: 'PH', oxygen: 'O2PPM', turbidity: 'TURB' });
    expect(NDBC_COLUMNS.txt).toEqual({ temperature: 'WTMP' });
  });

  it('builds the realtime2 URL', () => {
    expect(ndbcUrl('PPHH1', 'ocean')).toBe('https://www.ndbc.noaa.gov/data/realtime2/PPHH1.ocean');
    expect(ndbcUrl('41049', 'txt')).toBe('https://www.ndbc.noaa.gov/data/realtime2/41049.txt');
  });

  it('labels the source with the station and date', () => {
    expect(ndbcSourceLabel('PPHH1', '2026-10-22T18:15:00Z')).toBe('NOAA NDBC PPHH1, data from 2026-10-22');
  });
});

describe('sample CSV (frontend/src/data/iot-sample.csv)', () => {
  it('is marked as not measured', () => {
    expect(sampleCsv.split('\n')[0]).toBe('# SAMPLE VALUES - NOT MEASURED.');
  });

  it('fills only variables the stations do not report', () => {
    expect(parseSampleCsv(sampleCsv)).toEqual({
      'atlantic-buoy-2': { ph: { value: 8.05, unit: 'pH' }, oxygen: { value: 6.8, unit: 'mg/L' }, turbidity: { value: 1, unit: 'FTU' } },
      'indian-buoy-4': { ph: { value: 8.05, unit: 'pH' }, oxygen: { value: 6.8, unit: 'mg/L' }, turbidity: { value: 1, unit: 'FTU' } },
    });
  });
});

describe('bundled NDBC extract (frontend/src/data/ndbc-extract.json)', () => {
  it('has every IoT buoy location', () => {
    expect(Object.keys(extract.locations).sort()).toEqual(IOT_STATIONS.map(s => s.id).sort());
  });

  it.each(IOT_STATIONS.map(s => [s.id, s] as const))('%s has a measured temperature with a time', (id, station) => {
    const loc = extract.locations[id as keyof typeof extract.locations];
    expect(loc.station).toBe(station.station);
    expect(loc.readings.temperature).toMatchObject({ source: 'ndbc', column: NDBC_COLUMNS[station.file].temperature });
    expect(loc.readings.temperature.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/);
  });

  it('uses measured pH, oxygen and turbidity at the .ocean stations', () => {
    for (const id of ['pacific-buoy-1', 'caribbean-buoy-3'] as const) {
      for (const v of ['ph', 'oxygen', 'turbidity'] as const) expect(extract.locations[id].readings[v].source, `${id} ${v}`).toBe('ndbc');
    }
  });

  it('uses labelled sample values where the station has none', () => {
    for (const id of ['atlantic-buoy-2', 'indian-buoy-4'] as const) {
      for (const v of ['ph', 'oxygen', 'turbidity'] as const) expect(extract.locations[id].readings[v].source, `${id} ${v}`).toBe('sample');
    }
  });
});
