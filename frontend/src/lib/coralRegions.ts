// Coral reef regions offered in the Coral module. Each has one representative
// point as [lat, lon]. Shared by the UI, the CRW extract script and tests.
export interface CoralRegion {
  id: string;
  name: string;
  coordinates: [number, number][];
}

export const CORAL_REGIONS: CoralRegion[] = [
  { id: 'great_barrier_reef', name: 'Great Barrier Reef – Australia', coordinates: [[-18.2871, 147.6992]] },
  { id: 'coral_triangle', name: 'Coral Triangle – Southeast Asia', coordinates: [[0.0, 120.0]] },
  { id: 'maldives', name: 'Maldives – Indian Ocean', coordinates: [[3.2028, 73.2207]] },
  { id: 'andaman_nicobar_islands', name: 'Andaman & Nicobar Islands – India', coordinates: [[11.7401, 92.6586]] },
  { id: 'hawaii', name: 'Hawaii – Central Pacific Ocean', coordinates: [[21.3099, -157.8581]] },
  { id: 'caribbean_reefs', name: 'Caribbean Reefs – Caribbean Sea', coordinates: [[18.0, -75.0]] },
  { id: 'florida_keys', name: 'Florida Keys – United States', coordinates: [[24.5551, -81.78]] },
  { id: 'seychelles', name: 'Seychelles – Western Indian Ocean', coordinates: [[-4.6796, 55.492]] },
  { id: 'red_sea_reefs', name: 'Red Sea Reefs – Middle East', coordinates: [[20.0, 38.0]] },
  { id: 'persian_gulf', name: 'Persian Gulf (Arabian Gulf) – Arabian Peninsula', coordinates: [[26.0, 52.0]] },
];
