// NOAA National Data Buoy Center (NDBC) "realtime2" files (last 45 days).
// Pure functions only (no runtime imports) so scripts/update-ndbc-extract.mts
// can import this file directly with Node.
//
// The browser cannot fetch these files: NDBC sends no Access-Control-Allow-Origin
// header (CORS), so the app reads a dated extract bundled in
// frontend/src/data/ndbc-extract.json instead.

export const NDBC_BASE = 'https://www.ndbc.noaa.gov/data/realtime2';

export type IotVariable = 'temperature' | 'ph' | 'oxygen' | 'turbidity';
export type NdbcFileType = 'ocean' | 'txt';

// IoT variable -> NDBC column. Standard meteorological (.txt) files have water
// temperature only; pH, dissolved oxygen and turbidity are in .ocean files.
export const NDBC_COLUMNS = {
  ocean: { temperature: 'OTMP', ph: 'PH', oxygen: 'O2PPM', turbidity: 'TURB' },
  txt: { temperature: 'WTMP' },
} as const satisfies Record<NdbcFileType, Partial<Record<IotVariable, string>>>;

export function ndbcUrl(station: string, file: NdbcFileType): string {
  return `${NDBC_BASE}/${station}.${file}`;
}

export interface NdbcRow {
  /** UTC, e.g. 2026-10-22T18:15:00Z */
  time: string;
  /** Measurement columns (after YY MM DD hh mm); null where NDBC wrote MM. */
  values: Record<string, number | null>;
}

export interface NdbcTable {
  columns: string[];
  units: string[];
  /** Newest first, as in the file. */
  rows: NdbcRow[];
}

// Parses a realtime2 file: "#YY MM DD hh mm ..." header, "#yr mo dy ..." units,
// then whitespace-separated rows, newest first. A last line without a trailing
// newline (cut off by a range request) is dropped, since its last value may be partial.
export function parseNdbcRealtime(text: string): NdbcTable {
  let lines = text.split('\n');
  if (!text.endsWith('\n')) lines = lines.slice(0, -1);
  lines = lines.map(l => l.replace(/\r$/, '')).filter(l => l.trim() !== '');
  if (!lines[0]?.startsWith('#YY')) {
    throw new Error('Not an NDBC realtime file (expected a "#YY  MM DD hh mm" header)');
  }
  const columns = lines[0].slice(1).trim().split(/\s+/);
  const units = (lines[1] ?? '').slice(1).trim().split(/\s+/);
  const rows: NdbcRow[] = [];
  for (const line of lines.slice(2)) {
    if (line.startsWith('#')) continue;
    const f = line.trim().split(/\s+/);
    if (f.length !== columns.length) continue;
    const values: Record<string, number | null> = {};
    for (let i = 5; i < columns.length; i++) values[columns[i]] = f[i] === 'MM' ? null : Number(f[i]);
    rows.push({ time: `${f[0]}-${f[1]}-${f[2]}T${f[3]}:${f[4]}:00Z`, values });
  }
  return { columns, units, rows };
}

// Newest non-missing value of a column, or null if the file never reports it.
export function latestValue(table: NdbcTable, column: string): { value: number; time: string } | null {
  if (!table.columns.includes(column)) return null;
  for (const row of table.rows) {
    const value = row.values[column];
    if (value !== null && value !== undefined) return { value, time: row.time };
  }
  return null;
}

export function ndbcSourceLabel(station: string, time: string): string {
  return `NOAA NDBC ${station}, data from ${time.slice(0, 10)}`;
}

export type SampleValues = Record<string, Partial<Record<IotVariable, { value: number; unit: string }>>>;

// Reads frontend/src/data/iot-sample.csv: "#" comment lines, then
// location,variable,value,unit rows.
export function parseSampleCsv(text: string): SampleValues {
  const out: SampleValues = {};
  const rows = text.split(/\r?\n/).filter(l => l.trim() !== '' && !l.startsWith('#'));
  for (const line of rows.slice(1)) {
    const [location, variable, value, unit] = line.split(',');
    (out[location] ??= {})[variable as IotVariable] = { value: Number(value), unit };
  }
  return out;
}

export type IotReadingValue =
  | { value: number; unit: string; source: 'ndbc'; column: string; time: string }
  | { value: number; unit: string; source: 'sample' };

export interface NdbcLocation {
  station: string;
  name: string;
  file: NdbcFileType;
  lat: number;
  lon: number;
  readings: Record<IotVariable, IotReadingValue>;
}

export interface NdbcExtract {
  source: string;
  retrieved: string;
  sampleFile: string;
  locations: Record<string, NdbcLocation>;
}
