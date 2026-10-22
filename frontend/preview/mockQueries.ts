// Stand-in for src/hooks/useQueries.ts in the preview harness: no canister,
// no Internet Identity. Saves are recorded on window.__previewSaves.
import { useState } from 'react';
import { CORAL_REGIONS } from '../src/lib/coralRegions';

const saves: unknown[] = [];
(window as unknown as { __previewSaves: unknown[] }).__previewSaves = saves;

export function useGetCoralRegionCoordinates() {
  return { data: CORAL_REGIONS };
}

export function useGetCoralAnalysisHistory() {
  return { data: [], isLoading: false };
}

export function useSaveCoralAnalysis() {
  const [isPending, setPending] = useState(false);
  return {
    isPending,
    mutateAsync: async (params: unknown) => {
      setPending(true);
      saves.push(params);
      setPending(false);
      return true;
    },
  };
}
