// Regenerates frontend/src/data/crw-extract.json from NOAA Coral Reef Watch
// (NOAA CoastWatch ERDDAP, free, no API key).
//
//   node scripts/update-crw-extract.mts        (Node 23.6+ runs TypeScript directly)
//
// For each coral region: snap its point to the CRW 0.05-degree grid, pick the
// nearest water cell within +/- 0.25 degrees (using DHW, which is NaN on land),
// then read DHW, HotSpot, SST anomaly and Bleaching Alert Area at that cell for
// the latest date all four datasets have.
import { writeFileSync } from 'node:fs';
import { CORAL_REGIONS } from '../frontend/src/lib/coralRegions.ts';
import {
  CRW_DATASETS,
  ERDDAP_BASE,
  crwUrl,
  nearestWaterCell,
  parseErddapCsv,
  snapToCrwCell,
  type CrwExtract,
  type CrwProduct,
  type CrwReading,
} from '../frontend/src/lib/crw.ts';

const OUT = new URL('../frontend/src/data/crw-extract.json', import.meta.url);
const SEARCH_HALF_WIDTH = 0.25;

async function get(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  await new Promise(r => setTimeout(r, 200)); // be gentle with the public server
  return res.text();
}

// Latest date (YYYY-MM-DD) in a dataset's time dimension.
async function latestDate(product: CrwProduct): Promise<string> {
  const text = await get(`${ERDDAP_BASE}/${CRW_DATASETS[product].id}.csv?time%5B(last)%5D`);
  const value = text.split(/\r?\n/)[2];
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value ?? '')) throw new Error(`Unexpected time response: ${text.slice(0, 200)}`);
  return value.slice(0, 10);
}

async function valueAt(product: CrwProduct, date: string, cell: { lat: number; lon: number }): Promise<number> {
  const { rows } = parseErddapCsv(await get(crwUrl(product, date, cell)));
  const value = rows[0]?.value;
  if (value === null || value === undefined) throw new Error(`No ${product} value at ${cell.lat}, ${cell.lon} on ${date}`);
  return value;
}

const products = Object.keys(CRW_DATASETS) as CrwProduct[];
const latest = await Promise.all(products.map(latestDate));
const date = latest.sort()[0];
console.log(`Latest dates: ${products.map((p, i) => `${p}=${latest[i]}`).join(', ')}; using ${date}`);

const regions: Record<string, CrwReading> = {};
for (const region of CORAL_REGIONS) {
  const [lat, lon] = region.coordinates[0];
  const snapped = snapToCrwCell(lat, lon);
  const box = parseErddapCsv(await get(crwUrl('dhw', date, snapped, SEARCH_HALF_WIDTH)));
  const water = nearestWaterCell(box.rows, snapped.lat, snapped.lon);
  if (!water) throw new Error(`No water cell within ${SEARCH_HALF_WIDTH} degrees of ${region.id}`);
  const cell = { lat: water.lat, lon: water.lon };
  regions[region.id] = {
    requested: { lat, lon },
    cell,
    distanceKm: water.distanceKm,
    dhw: await valueAt('dhw', date, cell),
    hotspot: await valueAt('hotspot', date, cell),
    sstAnomaly: await valueAt('ssta', date, cell),
    baa: await valueAt('baa', date, cell),
  };
  console.log(`${region.id}: cell ${cell.lat},${cell.lon} (${water.distanceKm} km from snapped)`, regions[region.id]);
}

const extract: CrwExtract = {
  source: 'NOAA Coral Reef Watch daily 5 km products via NOAA CoastWatch ERDDAP (coastwatch.noaa.gov)',
  date,
  retrieved: new Date().toISOString().slice(0, 10),
  datasets: Object.fromEntries(products.map(p => [p, CRW_DATASETS[p].id])) as Record<CrwProduct, string>,
  citation: 'Data: NOAA Coral Reef Watch (https://coralreefwatch.noaa.gov)',
  regions,
};
writeFileSync(OUT, JSON.stringify(extract, null, 2) + '\n');
console.log(`Wrote ${OUT.pathname}`);
