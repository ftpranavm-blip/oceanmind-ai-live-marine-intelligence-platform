// NOAA Coral Reef Watch (CRW) parsing, grid snapping and risk mapping, tested
// against saved ERDDAP responses in __fixtures__/crw (no network).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CRW_DATASETS,
  crwRiskInputs,
  crwSourceLabel,
  crwUrl,
  nearestWaterCell,
  parseErddapCsv,
  snapToCrwCell,
} from './crw';
import { CORAL_REGIONS } from './coralRegions';
import { coralRiskScore, isCoralAlert } from './risk';
import extract from '../data/crw-extract.json';

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/crw/${name}`, import.meta.url), 'utf8');

// True when x is an odd multiple of 0.025 (a CRW 0.05-degree cell centre).
const isCellCentre = (x: number) => Math.abs(Math.round(x / 0.025)) % 2 === 1 && Math.abs(x / 0.025 - Math.round(x / 0.025)) < 1e-6;

describe('snapToCrwCell', () => {
  it('snaps the Great Barrier Reef point to the cell that contains it', () => {
    expect(snapToCrwCell(-18.2871, 147.6992)).toEqual({ lat: -18.275, lon: 147.675 });
  });

  it('snaps the Florida Keys point to (24.575, -81.775)', () => {
    expect(snapToCrwCell(24.5551, -81.78)).toEqual({ lat: 24.575, lon: -81.775 });
  });

  it('keeps a value that is already a cell centre', () => {
    expect(snapToCrwCell(21.325, -157.875)).toEqual({ lat: 21.325, lon: -157.875 });
  });

  it('puts a point on a cell edge into a neighbouring cell centre', () => {
    const { lat, lon } = snapToCrwCell(0, 120);
    expect(isCellCentre(lat) && isCellCentre(lon)).toBe(true);
  });

  it('stays inside the grid at the poles and the antimeridian', () => {
    expect(snapToCrwCell(90, 180)).toEqual({ lat: 89.975, lon: 179.975 });
    expect(snapToCrwCell(-90, -180)).toEqual({ lat: -89.975, lon: -179.975 });
  });

  it.each(CORAL_REGIONS.map(r => [r.id, r] as const))('%s snaps to a cell centre within 0.025 degrees', (_id, region) => {
    const [lat, lon] = region.coordinates[0];
    const cell = snapToCrwCell(lat, lon);
    expect(isCellCentre(cell.lat) && isCellCentre(cell.lon)).toBe(true);
    expect(Math.abs(cell.lat - lat)).toBeLessThanOrEqual(0.025 + 1e-9);
    expect(Math.abs(cell.lon - lon)).toBeLessThanOrEqual(0.025 + 1e-9);
  });
});

describe('parseErddapCsv', () => {
  it('reads variable, unit and value from a single-cell response', () => {
    expect(parseErddapCsv(fixture('dhw_keywest.csv'))).toEqual({
      variable: 'degree_heating_week',
      unit: 'degree_Celsius_weeks',
      rows: [{ time: '2026-10-15T12:00:00Z', lat: 24.575, lon: -81.775, value: 14.83 }],
    });
  });

  it('reads each CRW variable', () => {
    expect(parseErddapCsv(fixture('baa_keywest.csv')).rows[0].value).toBe(1);
    expect(parseErddapCsv(fixture('hotspot_gbr.csv')).rows[0].value).toBe(-2.96);
    expect(parseErddapCsv(fixture('ssta_keywest.csv')).rows[0].value).toBe(1.99);
  });

  it('turns land cells (NaN) into null', () => {
    const { rows } = parseErddapCsv(fixture('dhw_honolulu_box.csv'));
    expect(rows).toHaveLength(25);
    expect(rows.filter(r => r.value === null)).toHaveLength(13);
  });

  it('accepts CRLF line endings', () => {
    expect(parseErddapCsv(fixture('dhw_gbr.csv').replace(/\n/g, '\r\n')).rows[0].value).toBe(0);
  });

  it('rejects a non-CSV response such as the HTML 404 page', () => {
    // First line of the real response for a date past the dataset's coverage (2026-10-21).
    expect(() => parseErddapCsv('<!DOCTYPE html>\n<html lang="en" dir="ltr" class="h-100">')).toThrow(/ERDDAP CSV/);
  });
});

describe('nearestWaterCell', () => {
  it('returns the cell itself when it is water', () => {
    const { rows } = parseErddapCsv(fixture('dhw_gbr.csv'));
    expect(nearestWaterCell(rows, -18.275, 147.675)).toMatchObject({ lat: -18.275, lon: 147.675, distanceKm: 0 });
  });

  it('moves a land cell (Honolulu) to the nearest water cell', () => {
    const { rows } = parseErddapCsv(fixture('dhw_honolulu_box.csv'));
    const cell = nearestWaterCell(rows, 21.325, -157.875);
    expect(cell).toMatchObject({ lat: 21.275, lon: -157.875, value: 0 });
    expect(cell!.distanceKm).toBeCloseTo(5.56, 1);
  });

  it('returns null when every cell is land', () => {
    expect(nearestWaterCell([{ time: 't', lat: 0.025, lon: 0.025, value: null }], 0.025, 0.025)).toBeNull();
  });
});

describe('crwRiskInputs (documented rule)', () => {
  const risk = (dhw: number, baa: number) => {
    const { bleaching, thermalStress } = crwRiskInputs({ dhw, baa });
    return coralRiskScore(bleaching, thermalStress);
  };

  it('scales DHW so 8 degree C-weeks (CRW Alert Level 2) is the maximum thermal stress', () => {
    expect(crwRiskInputs({ dhw: 0, baa: 0 }).thermalStress).toBe(0);
    expect(crwRiskInputs({ dhw: 4, baa: 0 }).thermalStress).toBe(5);
    expect(crwRiskInputs({ dhw: 8, baa: 0 }).thermalStress).toBe(10);
    expect(crwRiskInputs({ dhw: 20, baa: 0 }).thermalStress).toBe(10);
  });

  it('scales the bleaching alert level 0-4 to 0-10', () => {
    expect([0, 1, 2, 3, 4].map(baa => crwRiskInputs({ dhw: 0, baa }).bleaching)).toEqual([0, 2.5, 5, 7.5, 10]);
  });

  it('raises bleaching to the alert level implied by accumulated DHW', () => {
    expect(crwRiskInputs({ dhw: 3.99, baa: 1 }).bleaching).toBe(2.5);
    expect(crwRiskInputs({ dhw: 4, baa: 1 }).bleaching).toBe(7.5);
    expect(crwRiskInputs({ dhw: 8, baa: 1 }).bleaching).toBe(10);
  });

  it('gives the Great Barrier Reef fixture (DHW 0, BAA 0) a risk of 0 and no alert', () => {
    const dhw = parseErddapCsv(fixture('dhw_gbr.csv')).rows[0].value!;
    const baa = parseErddapCsv(fixture('baa_gbr.csv')).rows[0].value!;
    expect(risk(dhw, baa)).toBe(0);
    expect(isCoralAlert(risk(dhw, baa))).toBe(false);
  });

  it('gives the Florida Keys fixture (DHW 14.83, BAA 1) a risk of 10 and an alert', () => {
    const dhw = parseErddapCsv(fixture('dhw_keywest.csv')).rows[0].value!;
    const baa = parseErddapCsv(fixture('baa_keywest.csv')).rows[0].value!;
    expect(risk(dhw, baa)).toBe(10);
    expect(isCoralAlert(risk(dhw, baa))).toBe(true);
  });

  it('treats a CRW Alert Level 1 reading (DHW 4, BAA 3) as an alert', () => {
    expect(risk(4, 3)).toBeCloseTo(6.5);
    expect(isCoralAlert(risk(4, 3))).toBe(true);
  });
});

describe('crwUrl', () => {
  it('builds an ERDDAP griddap CSV query for one cell on coastwatch.noaa.gov', () => {
    expect(crwUrl('dhw', '2026-10-15', { lat: -18.275, lon: 147.675 })).toBe(
      'https://coastwatch.noaa.gov/erddap/griddap/noaacrwdhwDaily.csv?degree_heating_week%5B(2026-10-15T12:00:00Z)%5D%5B(-18.275)%5D%5B(147.675)%5D',
    );
  });

  it('builds a box query around a cell', () => {
    expect(crwUrl('baa', '2026-10-15', { lat: 21.325, lon: -157.875 }, 0.1)).toBe(
      'https://coastwatch.noaa.gov/erddap/griddap/noaacrwbaa7dDaily.csv?bleaching_alert_area%5B(2026-10-15T12:00:00Z)%5D%5B(21.225):(21.425)%5D%5B(-157.975):(-157.775)%5D',
    );
  });

  it('knows the four CRW datasets', () => {
    expect(Object.values(CRW_DATASETS).map(d => d.id)).toEqual([
      'noaacrwdhwDaily',
      'noaacrwhotspotDaily',
      'noaacrwsstanomalyDaily',
      'noaacrwbaa7dDaily',
    ]);
  });
});

describe('bundled CRW extract (frontend/src/data/crw-extract.json)', () => {
  it('has one dated reading per coral region', () => {
    expect(Object.keys(extract.regions).sort()).toEqual(CORAL_REGIONS.map(r => r.id).sort());
    expect(extract.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it.each(Object.entries(extract.regions))('%s uses a water cell near the region with values in range', (id, reading) => {
    const region = CORAL_REGIONS.find(r => r.id === id)!;
    const [lat, lon] = region.coordinates[0];
    expect(isCellCentre(reading.cell.lat) && isCellCentre(reading.cell.lon)).toBe(true);
    expect(Math.abs(reading.cell.lat - lat)).toBeLessThanOrEqual(0.3);
    expect(Math.abs(reading.cell.lon - lon)).toBeLessThanOrEqual(0.3);
    expect(reading.dhw).toBeGreaterThanOrEqual(0);
    expect(reading.dhw).toBeLessThanOrEqual(100);
    expect([0, 1, 2, 3, 4]).toContain(reading.baa);
  });

  it('produces the UI source label with the extract date', () => {
    expect(crwSourceLabel(extract.date)).toBe(`NOAA CRW, data from ${extract.date}`);
  });
});
