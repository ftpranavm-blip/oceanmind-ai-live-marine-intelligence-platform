// NOAA NDBC stations behind the IoT module's four buoy locations. Shared by
// the UI, scripts/update-ndbc-extract.mts and tests.
//
// pH, dissolved oxygen and turbidity are only reported in NDBC ".ocean" files,
// and (checked 2026-10-22) almost only at coastal estuarine reserve stations,
// so the Pacific and Caribbean locations use estuarine stations next to reefs.
// The Atlantic and Indian Ocean stations report water temperature only.
export type NdbcFile = 'ocean' | 'txt';

export interface IotStation {
  /** Buoy location id used by the IoT module's select. */
  id: string;
  label: string;
  station: string;
  file: NdbcFile;
  lat: number;
  lon: number;
}

export const IOT_STATIONS: IotStation[] = [
  { id: 'pacific-buoy-1', label: "Pacific – Papahana, He'eia Reserve, O'ahu (NDBC PPHH1)", station: 'PPHH1', file: 'ocean', lat: 21.409, lon: -157.823 },
  { id: 'atlantic-buoy-2', label: 'Atlantic – 300 nm SSE of Bermuda (NDBC 41049)', station: '41049', file: 'txt', lat: 27.505, lon: -62.271 },
  { id: 'caribbean-buoy-3', label: 'Caribbean – Jobos Bay Reserve, Puerto Rico (NDBC JOBP4)', station: 'JOBP4', file: 'ocean', lat: 17.944, lon: -66.238 },
  { id: 'indian-buoy-4', label: 'Indian Ocean – 12°S 65°E (NDBC 14049)', station: '14049', file: 'txt', lat: -12, lon: 65 },
];
