import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, Alert, SatelliteAnalysis, CoralAnalysis, AISAnalysis, IoTAnalysis, FusionAnalysisRecord, AIRecommendations, MapData as BackendMapData, VesselData as BackendVesselData, OceanParameter as BackendOceanParameter } from '../backend';
import { CORAL_REGIONS } from '../lib/coralRegions';

// Define types that are not in the backend interface
export interface Region {
  id: string;
  name: string;
  coordinates: Array<[number, number]>;
}

export interface Coordinate {
  lat: number;
  lng: number;
}

// Re-export backend types for use in components
export type VesselData = BackendVesselData;
export type OceanParameter = BackendOceanParameter;
export type MapData = BackendMapData;

export interface FusionCorrelations {
  satelliteAIS: number;
  satelliteCoral: number;
  iotCoral: number;
  coralAIS: number;
  mapAIS: number;
  iotAIS: number;
  mapCoral: number;
  mapIot: number;
  iotSatellite: number;
  parameters: string;
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: { name: string; organization: string | null; role: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile({
        name: profile.name,
        organization: profile.organization || undefined,
        role: profile.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// Region Coordinates Query (Stubbed - backend not implemented)
export function useGetRegionCoordinates() {
  return useQuery<Region[]>({
    queryKey: ['regionCoordinates'],
    queryFn: async () => {
      return [
        { id: 'great_barrier_reef', name: 'Great Barrier Reef (Australia)', coordinates: [[-18.2871, 147.6992]] },
        { id: 'coral_triangle', name: 'Coral Triangle (SE Asia)', coordinates: [[0.0, 120.0]] },
        { id: 'maldives', name: 'Maldives', coordinates: [[3.2028, 73.2207]] },
        { id: 'andaman_nicobar_islands', name: 'Andaman & Nicobar Islands (India)', coordinates: [[11.7401, 92.6586]] },
        { id: 'red_sea', name: 'Red Sea', coordinates: [[20.0, 38.0]] },
        { id: 'hawaii', name: 'Hawaii', coordinates: [[21.3099, -157.8581]] },
        { id: 'florida_keys', name: 'Florida Keys (USA)', coordinates: [[24.5551, -81.7800]] },
      ];
    },
  });
}

// Coral Region Coordinates Query (Stubbed - backend not implemented)
export function useGetCoralRegionCoordinates() {
  return useQuery<Region[]>({
    queryKey: ['coralRegionCoordinates'],
    queryFn: async () => CORAL_REGIONS,
  });
}

// Satellite Analysis Queries
export function useGetSatelliteAnalysisHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<SatelliteAnalysis[]>({
    queryKey: ['satelliteAnalyses'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSatelliteAnalysisHistory();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 8000,
    staleTime: 0,
  });
}

export function useSaveSatelliteAnalysis() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      region: string;
      sourceSentinel1: boolean;
      sourceSentinel2: boolean;
      sourceLandsat: boolean;
      sourceModis: boolean;
      vesselCount: bigint;
      clusterFlag: boolean;
      pollutionFlag: boolean;
      nearCoral: boolean;
      marina_area_flag: boolean;
      riskScore: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const id = `sat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const success = await actor.saveSatelliteAnalysis(
        id,
        params.region,
        params.sourceSentinel1,
        params.sourceSentinel2,
        params.sourceLandsat,
        params.sourceModis,
        params.vesselCount,
        params.clusterFlag,
        params.pollutionFlag,
        params.nearCoral,
        params.marina_area_flag,
        params.riskScore
      );
      return success;
    },
    onSuccess: () => {
      // Immediately invalidate cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['satelliteAnalyses'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// Coral Analysis Queries
export function useGetCoralAnalysisHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<CoralAnalysis[]>({
    queryKey: ['coralAnalyses'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCoralAnalysisHistory();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 8000,
    staleTime: 0,
  });
}

export function useSaveCoralAnalysis() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      imageId: string | null;
      bleachingProbability: number;
      thermalStress: number;
      riskScore: number;
      alertStatus: boolean;
      region: string;
      dataType: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const success = await actor.saveCoralAnalysis(
        params.region,
        params.imageId,
        params.bleachingProbability,
        params.thermalStress,
        params.riskScore,
        params.dataType
      );
      return success;
    },
    onSuccess: () => {
      // Immediately invalidate cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['coralAnalyses'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// AIS Analysis Queries
export function useGetAISAnalysisHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<AISAnalysis[]>({
    queryKey: ['aisAnalyses'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAISAnalysisHistory();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 8000,
    staleTime: 0,
  });
}

export function useSaveAISAnalysis() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      dataModule: string;
      region: string;
      vesselIDs: string[];
      riskScore: number;
      alertStatus: boolean;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const id = `ais_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const success = await actor.saveAISAnalysis(
        id,
        params.dataModule,
        params.region,
        params.vesselIDs,
        params.riskScore
      );
      return success;
    },
    onSuccess: () => {
      // Immediately invalidate cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['aisAnalyses'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// IoT Analysis Queries
export function useGetIoTAnalysisHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<IoTAnalysis[]>({
    queryKey: ['iotAnalyses'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getIoTAnalysisHistory();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 8000,
    staleTime: 0,
  });
}

export function useSaveIoTAnalysis() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      dataModule: string;
      region: string;
      dataType: string;
      riskScore: number;
      alertStatus: boolean;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const id = `iot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const success = await actor.saveIoTAnalysis(
        id,
        params.dataModule,
        params.region,
        params.dataType,
        params.riskScore
      );
      return success;
    },
    onSuccess: () => {
      // Immediately invalidate cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['iotAnalyses'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// Fusion Analysis Queries
export function useGetFusionAnalysisHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<FusionAnalysisRecord[]>({
    queryKey: ['fusionAnalyses'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getFusionAnalysisHistory();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 8000,
    staleTime: 0,
  });
}

export function useSaveFusionAnalysis() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      correlations: FusionCorrelations;
      fusionRiskScore: number;
      globalRiskScore: number;
      alertsGenerated: bigint;
      aiRecommendations: AIRecommendations;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      const id = `fusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const success = await actor.saveFusionAnalysis(
        id,
        params.correlations,
        params.fusionRiskScore,
        params.globalRiskScore,
        params.alertsGenerated,
        params.aiRecommendations
      );
      return success;
    },
    onSuccess: () => {
      // Immediately invalidate cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['fusionAnalyses'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// Get AI Recommendations for a specific fusion analysis
export function useGetAIRecommendations(snapshotId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<AIRecommendations | null>({
    queryKey: ['aiRecommendations', snapshotId],
    queryFn: async () => {
      if (!actor || !snapshotId) return null;
      return actor.getAIRecommendations(snapshotId);
    },
    enabled: !!actor && !isFetching && !!snapshotId,
  });
}

// AIS Data Queries (Stubbed - backend not implemented)
export function useGetAllAISData() {
  return useQuery<any[]>({
    queryKey: ['aisData'],
    queryFn: async () => {
      return [];
    },
    refetchInterval: 10000,
  });
}

export function useAddAISData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: any) => {
      console.log('AIS data would be added:', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aisData'] });
    },
  });
}

// IoT Data Queries (Stubbed - backend not implemented)
export function useGetAllIoTData() {
  return useQuery<any[]>({
    queryKey: ['iotData'],
    queryFn: async () => {
      return [];
    },
    refetchInterval: 10000,
  });
}

export function useAddIoTData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: any) => {
      console.log('IoT data would be added:', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iotData'] });
    },
  });
}

// Alert Queries
export function useGetAllAlerts() {
  const { actor, isFetching } = useActor();

  return useQuery<Alert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllAlerts();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 8000,
    staleTime: 0,
  });
}

export function useGetAlertsByType(alertType: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Alert[]>({
    queryKey: ['alerts', 'type', alertType],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAlertsByType(alertType);
    },
    enabled: !!actor && !isFetching && !!alertType,
    refetchInterval: 8000,
    staleTime: 0,
  });
}

export function useGetAlertsBySeverity(severity: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<Alert[]>({
    queryKey: ['alerts', 'severity', severity.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAlertsBySeverity(severity);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 8000,
    staleTime: 0,
  });
}

export function useAddAlert() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      type: string;
      severity: bigint;
      source: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveAlert(params.id, params.type, params.severity, params.source);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useUpdateAlert() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      type: string;
      severity: bigint;
      source: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateAlert(params.id, params.type, params.severity, params.source);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// Risk Score Queries (Stubbed - backend not implemented)
export function useGetAllRiskScores() {
  return useQuery<any[]>({
    queryKey: ['riskScores'],
    queryFn: async () => {
      return [];
    },
    refetchInterval: 10000,
  });
}

// Live Ocean Map Queries
export function useGetMapData() {
  const { actor, isFetching } = useActor();

  return useQuery<MapData>({
    queryKey: ['mapData'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMapData();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 45000,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useGetVesselRiskAnalytics() {
  return useQuery<{
    lowRisk: bigint;
    mediumRisk: bigint;
    highRisk: bigint;
    criticalRisk: bigint;
    riskCoordinates: Array<{
      lat: number;
      lng: number;
      riskScore: number;
    }>;
  }>({
    queryKey: ['vesselRiskAnalytics'],
    queryFn: async () => {
      return {
        lowRisk: BigInt(0),
        mediumRisk: BigInt(0),
        highRisk: BigInt(0),
        criticalRisk: BigInt(0),
        riskCoordinates: [],
      };
    },
    refetchInterval: 8000,
  });
}

export function useAddVessel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      coordinates: { lat: number; lng: number };
      speed: number;
      riskScore: number;
      motionDirection: number;
    }) => {
      console.log('Vessel would be added:', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapData'] });
      queryClient.invalidateQueries({ queryKey: ['vesselRiskAnalytics'] });
    },
  });
}

export function useUpdateVesselMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      speed: number;
      motionDirection: number;
    }) => {
      console.log('Vessel movement would be updated:', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapData'] });
      queryClient.invalidateQueries({ queryKey: ['vesselRiskAnalytics'] });
    },
  });
}

export function useUpdateVesselPositions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('Vessel positions would be updated');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapData'] });
      queryClient.invalidateQueries({ queryKey: ['vesselRiskAnalytics'] });
    },
  });
}

export function useAddOrUpdateOceanParameter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      location: { lat: number; lng: number };
      temp: number;
      curr: { speed: number; direction: number };
      pollution: number;
    }) => {
      console.log('Ocean parameter would be added/updated:', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapData'] });
    },
  });
}
