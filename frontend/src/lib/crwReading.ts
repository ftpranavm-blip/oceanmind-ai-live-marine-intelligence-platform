// Reads the bundled NOAA Coral Reef Watch extract for the Coral module.
import extractJson from '../data/crw-extract.json';
import { crwRiskInputs, crwSourceLabel, type CrwExtract, type CrwReading } from './crw';

export const CRW_EXTRACT = extractJson as CrwExtract;

export interface CoralReadingFromCrw {
  /** Shown in the UI, e.g. "NOAA CRW, data from 2026-10-15". */
  label: string;
  /** Stored as the analysis dataType. */
  dataType: string;
  reading: CrwReading;
  bleaching: number;
  thermalStress: number;
}

export function crwReadingForRegion(regionId: string, extract: CrwExtract = CRW_EXTRACT): CoralReadingFromCrw | null {
  const reading = extract.regions[regionId];
  if (!reading) return null;
  return {
    label: crwSourceLabel(extract.date),
    dataType: `NOAA CRW ${extract.date}`,
    reading,
    ...crwRiskInputs(reading),
  };
}
