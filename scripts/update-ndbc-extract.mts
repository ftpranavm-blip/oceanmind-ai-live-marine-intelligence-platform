// Regenerates frontend/src/data/ndbc-extract.json from NOAA NDBC realtime2
// files (free, no API key).
//
//   node scripts/update-ndbc-extract.mts        (Node 23.6+ runs TypeScript directly)
//
// For each IoT buoy location: read the newest 32 KB of its station file (files
// are newest-first) and take the newest non-missing value of each variable.
// Variables the station does not report come from frontend/src/data/iot-sample.csv
// and are marked source "sample".
import { readFileSync, writeFileSync } from 'node:fs';
import { IOT_STATIONS } from '../frontend/src/lib/iotStations.ts';
import {
  NDBC_COLUMNS,
  latestValue,
  ndbcUrl,
  parseNdbcRealtime,
  parseSampleCsv,
  type IotReadingValue,
  type IotVariable,
  type NdbcExtract,
} from '../frontend/src/lib/ndbc.ts';

const OUT = new URL('../frontend/src/data/ndbc-extract.json', import.meta.url);
const SAMPLE = 'frontend/src/data/iot-sample.csv';
const samples = parseSampleCsv(readFileSync(new URL(`../${SAMPLE}`, import.meta.url), 'utf8'));
const VARIABLES: IotVariable[] = ['temperature', 'ph', 'oxygen', 'turbidity'];

async function newest(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Range: 'bytes=0-32767' } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  await new Promise(r => setTimeout(r, 300)); // be gentle with the public server
  return res.text();
}

const locations: NdbcExtract['locations'] = {};
for (const s of IOT_STATIONS) {
  const table = parseNdbcRealtime(await newest(ndbcUrl(s.station, s.file)));
  const columns: Partial<Record<IotVariable, string>> = NDBC_COLUMNS[s.file];
  const readings = {} as Record<IotVariable, IotReadingValue>;
  for (const v of VARIABLES) {
    const column = columns[v];
    const measured = column ? latestValue(table, column) : null;
    if (measured && column) {
      readings[v] = { value: measured.value, unit: table.units[table.columns.indexOf(column)], source: 'ndbc', column, time: measured.time };
      continue;
    }
    const sample = samples[s.id]?.[v];
    if (!sample) throw new Error(`${s.station} has no ${v} and ${SAMPLE} has no sample for ${s.id}`);
    readings[v] = { ...sample, source: 'sample' };
  }
  locations[s.id] = { station: s.station, name: s.label, file: s.file, lat: s.lat, lon: s.lon, readings };
  console.log(s.id, s.station, JSON.stringify(readings));
}

const extract: NdbcExtract = {
  source: 'NOAA National Data Buoy Center realtime2 files (www.ndbc.noaa.gov/data/realtime2)',
  retrieved: new Date().toISOString().slice(0, 10),
  sampleFile: SAMPLE,
  locations,
};
writeFileSync(OUT, JSON.stringify(extract, null, 2) + '\n');
console.log(`Wrote ${OUT.pathname}`);
