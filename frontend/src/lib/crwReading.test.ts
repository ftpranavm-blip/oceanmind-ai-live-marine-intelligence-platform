import { describe, expect, it } from 'vitest';
import { crwRiskInputs, type CrwExtract } from './crw';
import { CRW_EXTRACT, crwReadingForRegion } from './crwReading';
import { CORAL_REGIONS } from './coralRegions';

const sample: CrwExtract = {
  source: 'test',
  date: '2026-10-15',
  retrieved: '2026-10-22',
  datasets: { dhw: 'noaacrwdhwDaily', hotspot: 'noaacrwhotspotDaily', ssta: 'noaacrwsstanomalyDaily', baa: 'noaacrwbaa7dDaily' },
  citation: 'test',
  regions: {
    // Values from the Florida Keys fixtures (__fixtures__/crw/*_keywest.csv).
    florida_keys: {
      requested: { lat: 24.5551, lon: -81.78 },
      cell: { lat: 24.575, lon: -81.775 },
      distanceKm: 0,
      dhw: 14.83,
      hotspot: 0,
      sstAnomaly: 1.99,
      baa: 1,
    },
  },
};

describe('crwReadingForRegion', () => {
  it('turns a CRW reading into coral inputs with a dated source label', () => {
    expect(crwReadingForRegion('florida_keys', sample)).toEqual({
      label: 'NOAA CRW, data from 2026-10-15',
      dataType: 'NOAA CRW 2026-10-15',
      reading: sample.regions.florida_keys,
      bleaching: 10,
      thermalStress: 10,
    });
  });

  it('returns null for a region missing from the extract', () => {
    expect(crwReadingForRegion('atlantis', sample)).toBeNull();
  });

  it('covers every coral region in the bundled extract using the documented rule', () => {
    for (const region of CORAL_REGIONS) {
      const result = crwReadingForRegion(region.id);
      expect(result, region.id).not.toBeNull();
      expect(result!.label).toBe(`NOAA CRW, data from ${CRW_EXTRACT.date}`);
      const expected = crwRiskInputs(CRW_EXTRACT.regions[region.id]);
      expect(result!.bleaching).toBe(expected.bleaching);
      expect(result!.thermalStress).toBe(expected.thermalStress);
    }
  });
});
