// NOAA Coral Reef Watch (CRW) daily 5 km products via NOAA CoastWatch ERDDAP.
// Pure functions only (no runtime imports) so scripts/update-crw-extract.mts
// can import this file directly with Node.
//
// The browser cannot call ERDDAP directly: its responses carry no
// Access-Control-Allow-Origin header (CORS), so the app reads a dated extract
// bundled in frontend/src/data/crw-extract.json instead.

export const ERDDAP_BASE = 'https://coastwatch.noaa.gov/erddap/griddap';

export const CRW_DATASETS = {
  dhw: { id: 'noaacrwdhwDaily', variable: 'degree_heating_week', unit: 'degree_Celsius_weeks' },
  hotspot: { id: 'noaacrwhotspotDaily', variable: 'hotspot', unit: 'degree_C' },
  ssta: { id: 'noaacrwsstanomalyDaily', variable: 'sea_surface_temperature_anomaly', unit: 'degree_C' },
  baa: { id: 'noaacrwbaa7dDaily', variable: 'bleaching_alert_area', unit: 'stress_level' },
} as const;

export type CrwProduct = keyof typeof CRW_DATASETS;

export interface LatLon {
  lat: number;
  lon: number;
}

// CRW cells are 0.05 degrees wide; centres sit at odd multiples of 0.025.
const CELL = 0.05;
const MAX_LAT = 89.975;
const MAX_LON = 179.975;

const round3 = (x: number) => Math.round(x * 1000) / 1000;
const clamp = (x: number, max: number) => Math.max(-max, Math.min(max, x));

// Centre of the CRW cell containing (lat, lon).
export function snapToCrwCell(lat: number, lon: number): LatLon {
  const centre = (x: number) => round3(Math.floor(x / CELL) * CELL + CELL / 2);
  return { lat: clamp(centre(lat), MAX_LAT), lon: clamp(centre(lon), MAX_LON) };
}

const fmt = (x: number) => String(round3(x));
const enc = (s: string) => s.replace(/\[/g, '%5B').replace(/\]/g, '%5D');

// ERDDAP griddap CSV query for one cell, or a box of +/- halfWidth degrees around it.
export function crwUrl(product: CrwProduct, date: string, cell: LatLon, halfWidth = 0): string {
  const { id, variable } = CRW_DATASETS[product];
  const range = (c: number) => (halfWidth > 0 ? `[(${fmt(c - halfWidth)}):(${fmt(c + halfWidth)})]` : `[(${fmt(c)})]`);
  return `${ERDDAP_BASE}/${id}.csv?${variable}${enc(`[(${date}T12:00:00Z)]${range(cell.lat)}${range(cell.lon)}`)}`;
}

export interface ErddapRow {
  time: string;
  lat: number;
  lon: number;
  /** null for land, ice or missing cells (ERDDAP writes NaN). */
  value: number | null;
}

export interface ErddapGrid {
  variable: string;
  unit: string;
  rows: ErddapRow[];
}

// Parses an ERDDAP griddap .csv response: a header row, a units row, then
// one row per cell (time, latitude, longitude, value).
export function parseErddapCsv(text: string): ErddapGrid {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const header = lines[0]?.split(',') ?? [];
  if (header.length !== 4 || header[0] !== 'time' || header[1] !== 'latitude' || header[2] !== 'longitude') {
    throw new Error('Not an ERDDAP CSV response (expected "time,latitude,longitude,<variable>")');
  }
  const unit = lines[1]?.split(',')[3] ?? '';
  const rows = lines.slice(2).map(line => {
    const [time, lat, lon, value] = line.split(',');
    return { time, lat: Number(lat), lon: Number(lon), value: value === 'NaN' ? null : Number(value) };
  });
  return { variable: header[3], unit, rows };
}

function distanceKm(a: LatLon, b: LatLon): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// The water cell (non-null value) closest to (lat, lon), or null if all are land.
export function nearestWaterCell(rows: ErddapRow[], lat: number, lon: number): (ErddapRow & { distanceKm: number }) | null {
  let best: (ErddapRow & { distanceKm: number }) | null = null;
  for (const row of rows) {
    if (row.value === null) continue;
    const d = distanceKm({ lat, lon }, row);
    if (!best || d < best.distanceKm) best = { ...row, distanceKm: round3(d) };
  }
  return best;
}

// Rule for turning CRW values into the Coral module's two 0-10 inputs
// (then combined by coralRiskScore: 0.6 * bleaching + 0.4 * thermalStress).
//  - thermalStress = min(DHW / 8, 1) * 10. 8 degree C-weeks is CRW's
//    Alert Level 2 threshold.
//  - bleaching = max(BAA * 2.5, DHW level), where BAA is CRW's 7-day
//    Bleaching Alert Area (0 No Stress, 1 Watch, 2 Warning, 3 Alert Level 1,
//    4 Alert Level 2) and DHW level is 7.5 at DHW >= 4 (Alert Level 1
//    threshold) and 10 at DHW >= 8 (Alert Level 2 threshold). BAA falls back
//    once current HotSpots end, while accumulated DHW still indicates
//    bleaching risk, so the higher of the two is used.
// This is this app's rule built on CRW's thresholds, not a CRW product.
export function crwRiskInputs({ dhw, baa }: { dhw: number; baa: number }): { bleaching: number; thermalStress: number } {
  const thermalStress = Math.min(dhw / 8, 1) * 10;
  const dhwLevel = dhw >= 8 ? 10 : dhw >= 4 ? 7.5 : 0;
  return { bleaching: Math.max(baa * 2.5, dhwLevel), thermalStress };
}

export function crwSourceLabel(date: string): string {
  return `NOAA CRW, data from ${date}`;
}

export interface CrwReading {
  requested: LatLon;
  cell: LatLon;
  distanceKm: number;
  dhw: number;
  hotspot: number;
  sstAnomaly: number;
  baa: number;
}

export interface CrwExtract {
  source: string;
  date: string;
  retrieved: string;
  datasets: Record<CrwProduct, string>;
  citation: string;
  regions: Record<string, CrwReading>;
}
