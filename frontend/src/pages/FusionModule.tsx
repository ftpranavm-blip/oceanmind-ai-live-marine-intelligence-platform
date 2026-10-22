import { useGetSatelliteAnalysisHistory, useGetCoralAnalysisHistory, useGetAISAnalysisHistory, useGetIoTAnalysisHistory, useGetMapData, useAddAlert, useGetFusionAnalysisHistory, useSaveFusionAnalysis } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Network, TrendingUp, AlertTriangle, Activity, Zap, Database, Clock, Save, AlertCircle, Lightbulb, CheckCircle, Users, Target, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AIRecommendations, ActionStep, Stakeholder, ConfidenceLevel } from '../backend';
import {
  moduleRiskAverages,
  globalMarineRiskIndex,
  fusionRiskScore as computeFusionRiskScore,
  fusionIndexBand,
  fusionIndexPercent,
  computeCorrelations,
  selectRecommendationScenario,
  shouldGenerateRecommendations,
  confidenceIndicator,
  isHighRiskAIS,
  isCoralEmergency,
  isHighRiskIoT,
  isMpaViolation,
  type FusionAlert,
  type CorrelationMetric,
} from '../lib/fusion';
import { moduleRiskPercent } from '../lib/risk';

export default function FusionModule() {
  const { data: satelliteData = [], isLoading: satelliteLoading } = useGetSatelliteAnalysisHistory();
  const { data: coralData = [], isLoading: coralLoading } = useGetCoralAnalysisHistory();
  const { data: aisData = [], isLoading: aisLoading } = useGetAISAnalysisHistory();
  const { data: iotData = [], isLoading: iotLoading } = useGetIoTAnalysisHistory();
  const { data: mapData, isLoading: mapLoading } = useGetMapData();
  const { data: fusionHistory = [], isLoading: fusionHistoryLoading } = useGetFusionAnalysisHistory();
  const addAlert = useAddAlert();
  const saveFusionAnalysis = useSaveFusionAnalysis();

  const [fusionAlerts, setFusionAlerts] = useState<FusionAlert[]>([]);
  const [correlationMetrics, setCorrelationMetrics] = useState<CorrelationMetric[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [currentRecommendations, setCurrentRecommendations] = useState<AIRecommendations | null>(null);
  const [activeTab, setActiveTab] = useState<string>('analysis');
  const processedAlertsRef = useRef<Set<string>>(new Set());
  const lastRecommendationIdRef = useRef<string>('');
  const userHasInteractedRef = useRef<boolean>(false);

  const vessels = mapData?.vessels || [];
  const isLoading = satelliteLoading || coralLoading || aisLoading || iotLoading || mapLoading;

  // Calculate module risk scores
  const fusionInputs = { satellite: satelliteData, coral: coralData, ais: aisData, iot: iotData, vessels };
  const averages = moduleRiskAverages(fusionInputs);
  const avgSatelliteRisk = averages.satellite;
  const avgCoralRisk = averages.coral;
  const avgAISRisk = averages.ais;
  const avgIoTRisk = averages.iot;
  const avgVesselRisk = averages.vessel;

  // Calculate Global Marine Risk Index with fusion weighting
  const unifiedRiskIndex = globalMarineRiskIndex(fusionInputs);
  const unifiedRiskBand = fusionIndexBand(unifiedRiskIndex);

  // Calculate fusion risk score
  const fusionRiskScore = computeFusionRiskScore(averages);

  // Generate AI Recommendations based on current fusion analysis
  const generateAIRecommendations = (): AIRecommendations => {
    const timestamp = Date.now();
    const snapshotId = `fusion_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine primary risk type and situation
    let riskType = 'Normal Operations';
    let situationSummary = 'Current marine conditions are within normal parameters. ';
    let severityLevel = 'Low';
    let confidenceScore = 0.85;
    let actionableSteps: ActionStep[] = [];
    let responsibleStakeholders: Stakeholder[] = [];

    // Analyze fusion alerts to determine situation
    const scenario = selectRecommendationScenario(fusionAlerts, unifiedRiskIndex);

    if (scenario === 'illegal_fishing') {
      riskType = 'Illegal Fishing';
      severityLevel = 'Critical';
      confidenceScore = 0.92;
      situationSummary = `High-confidence illegal fishing activity detected through multi-source correlation. Satellite imagery shows ${satelliteData.filter(d => d.clusterFlag).length} vessel clusters combined with ${aisData.filter(isHighRiskAIS).length} high-risk AIS signatures. `;
      
      actionableSteps = [
        { action: 'Deploy patrol vessels', description: 'Dispatch coast guard or naval vessels to identified high-risk zones for immediate investigation', priority: 'High' },
        { action: 'Verify vessel identities', description: 'Cross-reference AIS data with vessel registration databases to identify suspicious vessels', priority: 'High' },
        { action: 'Coordinate surveillance', description: 'Increase satellite monitoring frequency over detected cluster areas', priority: 'Medium' },
        { action: 'Issue warnings', description: 'Broadcast maritime warnings to vessels in the area regarding enforcement operations', priority: 'Medium' },
      ];

      responsibleStakeholders = [
        { name: 'Coast Guard Operations', type: 'Enforcement', contactInfo: 'coastguard.ops@maritime.gov' },
        { name: 'Fisheries Management Authority', type: 'Regulatory', contactInfo: 'enforcement@fisheries.gov' },
        { name: 'Maritime Surveillance Center', type: 'Intelligence', contactInfo: 'surveillance@maritime.intel' },
      ];
    } else if (scenario === 'reef_emergency') {
      riskType = 'Reef Emergency';
      severityLevel = 'High';
      confidenceScore = 0.88;
      situationSummary = `Critical coral bleaching event detected in ${coralData.filter(isCoralEmergency).length} reef regions. Elevated thermal stress combined with high bleaching probability indicates immediate ecosystem threat. `;
      
      actionableSteps = [
        { action: 'Deploy research teams', description: 'Send marine biologists to affected reef areas for on-site assessment and documentation', priority: 'High' },
        { action: 'Implement cooling measures', description: 'Consider emergency reef cooling interventions in critical zones if feasible', priority: 'High' },
        { action: 'Restrict access', description: 'Temporarily close affected reef areas to tourism and recreational activities', priority: 'Medium' },
        { action: 'Monitor progression', description: 'Increase monitoring frequency to track bleaching progression and recovery', priority: 'Medium' },
      ];

      responsibleStakeholders = [
        { name: 'Marine Research Institute', type: 'Scientific', contactInfo: 'research@marine.institute' },
        { name: 'Environmental Protection Agency', type: 'Regulatory', contactInfo: 'coral.protection@epa.gov' },
        { name: 'Reef Conservation Network', type: 'Conservation', contactInfo: 'emergency@reefconservation.org' },
      ];
    } else if (scenario === 'pollution') {
      riskType = 'Pollution Event';
      severityLevel = 'High';
      confidenceScore = 0.90;
      situationSummary = `Multi-source pollution correlation detected. Satellite imagery shows ${satelliteData.filter(d => d.pollutionFlag).length} pollution patterns confirmed by ${iotData.filter(isHighRiskIoT).length} IoT sensor anomalies indicating water quality degradation. `;
      
      actionableSteps = [
        { action: 'Identify pollution source', description: 'Conduct immediate investigation to locate and identify the source of contamination', priority: 'High' },
        { action: 'Deploy containment measures', description: 'Implement oil booms, skimmers, or other containment equipment as appropriate', priority: 'High' },
        { action: 'Issue health advisories', description: 'Alert coastal communities and close affected beaches or fishing areas', priority: 'High' },
        { action: 'Coordinate cleanup', description: 'Mobilize cleanup crews and equipment to affected areas', priority: 'Medium' },
      ];

      responsibleStakeholders = [
        { name: 'Environmental Response Team', type: 'Emergency Response', contactInfo: 'emergency@environmental.response' },
        { name: 'Port Authority', type: 'Regulatory', contactInfo: 'pollution.control@port.authority' },
        { name: 'Public Health Department', type: 'Health & Safety', contactInfo: 'marine.health@publichealth.gov' },
      ];
    } else if (scenario === 'mpa_violation') {
      riskType = 'MPA Violation';
      severityLevel = 'High';
      confidenceScore = 0.87;
      situationSummary = `Multiple vessels detected inside Marine Protected Areas. ${satelliteData.filter(isMpaViolation).length} MPA violations identified through satellite monitoring. `;
      
      actionableSteps = [
        { action: 'Intercept violating vessels', description: 'Deploy enforcement vessels to intercept and inspect vessels in protected areas', priority: 'High' },
        { action: 'Document violations', description: 'Collect evidence including satellite imagery, AIS data, and vessel identification', priority: 'High' },
        { action: 'Issue citations', description: 'Process legal citations and fines for MPA violations', priority: 'Medium' },
        { action: 'Increase patrols', description: 'Enhance patrol frequency in affected Marine Protected Areas', priority: 'Medium' },
      ];

      responsibleStakeholders = [
        { name: 'Marine Protected Area Authority', type: 'Enforcement', contactInfo: 'enforcement@mpa.authority' },
        { name: 'Coast Guard', type: 'Law Enforcement', contactInfo: 'mpa.violations@coastguard.gov' },
        { name: 'Conservation Officers', type: 'Field Operations', contactInfo: 'field.ops@conservation.gov' },
      ];
    } else if (scenario === 'elevated') {
      riskType = 'Elevated Risk';
      severityLevel = 'Medium';
      confidenceScore = 0.82;
      situationSummary = `Elevated marine risk index detected across multiple monitoring systems. Global risk score of ${unifiedRiskIndex.toFixed(2)} indicates heightened monitoring requirements. `;
      
      actionableSteps = [
        { action: 'Increase monitoring', description: 'Enhance surveillance across all intelligence modules', priority: 'Medium' },
        { action: 'Review protocols', description: 'Verify emergency response protocols are current and ready', priority: 'Medium' },
        { action: 'Coordinate agencies', description: 'Brief all stakeholder agencies on current risk status', priority: 'Low' },
      ];

      responsibleStakeholders = [
        { name: 'Maritime Operations Center', type: 'Coordination', contactInfo: 'operations@maritime.center' },
        { name: 'Environmental Monitoring Agency', type: 'Monitoring', contactInfo: 'monitoring@environmental.agency' },
      ];
    } else {
      situationSummary += `All monitoring systems report normal conditions. Global risk index: ${unifiedRiskIndex.toFixed(2)}. Continue routine monitoring and data collection.`;
      
      actionableSteps = [
        { action: 'Maintain routine monitoring', description: 'Continue standard surveillance and data collection protocols', priority: 'Low' },
        { action: 'Review historical trends', description: 'Analyze historical data for pattern identification', priority: 'Low' },
      ];

      responsibleStakeholders = [
        { name: 'Maritime Operations Center', type: 'Coordination', contactInfo: 'operations@maritime.center' },
      ];
    }

    // Generate confidence levels for different aspects
    const confidenceLevels: ConfidenceLevel[] = [
      {
        category: 'Satellite Data',
        value: satelliteData.length > 0 ? 0.90 : 0.50,
        indicator: satelliteData.length > 0 ? 'High' : 'Low',
      },
      {
        category: 'Coral Monitoring',
        value: coralData.length > 0 ? 0.85 : 0.50,
        indicator: coralData.length > 0 ? 'High' : 'Low',
      },
      {
        category: 'AIS Intelligence',
        value: aisData.length > 0 ? 0.88 : 0.50,
        indicator: aisData.length > 0 ? 'High' : 'Low',
      },
      {
        category: 'IoT Sensors',
        value: iotData.length > 0 ? 0.82 : 0.50,
        indicator: iotData.length > 0 ? 'High' : 'Low',
      },
      {
        category: 'Overall Assessment',
        value: confidenceScore,
        indicator: confidenceIndicator(confidenceScore),
      },
    ];

    return {
      id: `rec_${timestamp}`,
      snapshotId,
      situationSummary,
      riskAssessment: {
        severityLevel,
        confidenceScore,
        riskType,
        overallRisk: severityLevel,
      },
      actionableSteps,
      responsibleStakeholders,
      confidenceLevels,
      timestamp: BigInt(timestamp * 1_000_000),
      owner: '' as any, // Will be set by backend
    };
  };

  // Real-time fusion correlation computation and alert generation
  useEffect(() => {
    if (isLoading) return;

    // Correlation rules live in lib/fusion.ts
    const { metrics: newCorrelationMetrics, alerts: correlatedAlerts } = computeCorrelations(fusionInputs, Date.now());
    const newFusionAlerts = correlatedAlerts.filter(a => !processedAlertsRef.current.has(a.id));

    // Update state with new fusion alerts and correlations
    setFusionAlerts(newFusionAlerts);
    setCorrelationMetrics(newCorrelationMetrics);
    setLastUpdateTime(Date.now());

    // Generate AI recommendations when analysis completes
    if (shouldGenerateRecommendations(newFusionAlerts.length, unifiedRiskIndex)) {
      const recommendations = generateAIRecommendations();
      const newRecommendationId = recommendations.id;
      
      // Only update recommendations if they're new
      if (newRecommendationId !== lastRecommendationIdRef.current) {
        setCurrentRecommendations(recommendations);
        lastRecommendationIdRef.current = newRecommendationId;
        
        // Auto-activate recommendations tab only if user hasn't manually interacted with tabs
        if (newFusionAlerts.length > 0 && !userHasInteractedRef.current) {
          setActiveTab('recommendations');
          // Reset interaction flag after a short delay to allow user to take control
          setTimeout(() => {
            userHasInteractedRef.current = false;
          }, 1000);
        }
      }
    }

    // Automatically save fusion alerts to backend with proper "Fusion" type tagging
    newFusionAlerts.forEach(alert => {
      if (!processedAlertsRef.current.has(alert.id)) {
        processedAlertsRef.current.add(alert.id);
        
        addAlert.mutate({
          id: alert.id,
          type: 'Fusion',
          severity: BigInt(alert.severity),
          source: `Fusion Engine: ${alert.type} | Sources: ${alert.sources.join(', ')}`,
        }, {
          onSuccess: () => {
            toast.success(`Fusion alert generated: ${alert.type}`, {
              description: alert.description,
              duration: 5000,
            });
          },
          onError: (error) => {
            console.error('Failed to save fusion alert:', error);
            processedAlertsRef.current.delete(alert.id);
          },
        });
      }
    });
  }, [satelliteData, coralData, aisData, iotData, vessels, isLoading, addAlert, unifiedRiskIndex]);

  const timeSinceUpdate = Math.floor((Date.now() - lastUpdateTime) / 1000);

  // Save fusion analysis snapshot with AI recommendations
  const handleSaveFusionAnalysis = async () => {
    try {
      const recommendations = currentRecommendations || generateAIRecommendations();
      
      await saveFusionAnalysis.mutateAsync({
        correlations: {
          satelliteAIS: correlationMetrics.find(m => m.name === 'Illegal Fishing Risk')?.value || 0,
          satelliteCoral: correlationMetrics.find(m => m.name === 'Reef Emergency Risk')?.value || 0,
          iotCoral: correlationMetrics.find(m => m.name === 'SST-Pollution Correlation')?.value || 0,
          coralAIS: 0,
          mapAIS: correlationMetrics.find(m => m.name === 'MPA Violation Risk')?.value || 0,
          iotAIS: correlationMetrics.find(m => m.name === 'Pollution Risk')?.value || 0,
          mapCoral: correlationMetrics.find(m => m.name === 'Vessel-Coral Impact')?.value || 0,
          mapIot: 0,
          iotSatellite: 0,
          parameters: `Satellite: ${satelliteData.length}, Coral: ${coralData.length}, AIS: ${aisData.length}, IoT: ${iotData.length}, Vessels: ${vessels.length}`,
        },
        fusionRiskScore,
        globalRiskScore: unifiedRiskIndex,
        alertsGenerated: BigInt(fusionAlerts.length),
        aiRecommendations: recommendations,
      });
      
      toast.success('Fusion analysis snapshot saved with AI recommendations', {
        description: `Captured state with ${fusionAlerts.length} active alerts and ${recommendations.actionableSteps.length} recommended actions`,
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Failed to save fusion analysis:', error);
      toast.error('Failed to save fusion analysis', {
        description: error.message || 'An unexpected error occurred',
        duration: 5000,
      });
    }
  };

  // Handle tab change with user interaction tracking
  const handleTabChange = (value: string) => {
    userHasInteractedRef.current = true;
    setActiveTab(value);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-chart-5 to-chart-1 flex items-center justify-center">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Fusion Engine</h1>
              <p className="text-muted-foreground">Real-time multi-source risk integration & unified intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-chart-1 animate-pulse" />
              <span>Live • Updated {timeSinceUpdate}s ago</span>
            </div>
            <Button 
              onClick={handleSaveFusionAnalysis} 
              disabled={saveFusionAnalysis.isPending} 
              size="sm"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saveFusionAnalysis.isPending ? 'Saving...' : 'Save Snapshot'}
            </Button>
          </div>
        </div>

        {/* Hero Image */}
        <Card>
          <CardContent className="p-0">
            <img
              src="/assets/generated/data-fusion-network.dim_800x600.jpg"
              alt="Data Fusion Network"
              className="w-full h-64 object-cover rounded-lg"
            />
          </CardContent>
        </Card>

        {/* Global Marine Risk Index */}
        <Card className="border-chart-1/50 bg-gradient-to-br from-chart-1/10 to-chart-2/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-chart-1" />
              Global Marine Risk Index
            </CardTitle>
            <CardDescription>Real-time aggregated risk score from all intelligence modules with fusion weighting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-5xl font-bold text-chart-1">
                  {unifiedRiskIndex.toFixed(2)}
                </span>
                <Badge 
                  variant={unifiedRiskBand === 'Critical' ? 'destructive' : unifiedRiskBand === 'Elevated' ? 'secondary' : 'outline'} 
                  className="text-lg px-4 py-2"
                >
                  {unifiedRiskBand}
                </Badge>
              </div>
              <Progress value={fusionIndexPercent(unifiedRiskIndex)} className="h-4" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="w-4 h-4" />
                <span>Live correlation from {satelliteData.length + coralData.length + aisData.length + iotData.length + vessels.length} data sources</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Interface with Enhanced Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger 
              value="analysis" 
              className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Network className="w-4 h-4" />
              Fusion Analysis
            </TabsTrigger>
            <TabsTrigger 
              value="recommendations" 
              className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Lightbulb className="w-4 h-4" />
              AI Recommendations
              {currentRecommendations && (
                <Badge variant="secondary" className="ml-2 text-xs">Available</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Database className="w-4 h-4" />
              Fusion History
            </TabsTrigger>
          </TabsList>

          {/* Fusion Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6 mt-6">
            {/* Module Risk Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="border-chart-1/50 bg-chart-1/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Satellite Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-chart-1">{avgSatelliteRisk.toFixed(2)}</div>
                  <Progress value={moduleRiskPercent(avgSatelliteRisk)} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">{satelliteData.length} analyses</p>
                </CardContent>
              </Card>

              <Card className="border-chart-2/50 bg-chart-2/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Coral Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-chart-2">{avgCoralRisk.toFixed(2)}</div>
                  <Progress value={moduleRiskPercent(avgCoralRisk)} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">{coralData.length} analyses</p>
                </CardContent>
              </Card>

              <Card className="border-chart-3/50 bg-chart-3/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">AIS Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-chart-3">{avgAISRisk.toFixed(2)}</div>
                  <Progress value={moduleRiskPercent(avgAISRisk)} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">{aisData.length} records</p>
                </CardContent>
              </Card>

              <Card className="border-chart-4/50 bg-chart-4/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">IoT Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-chart-4">{avgIoTRisk.toFixed(2)}</div>
                  <Progress value={moduleRiskPercent(avgIoTRisk)} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">{iotData.length} readings</p>
                </CardContent>
              </Card>

              <Card className="border-chart-5/50 bg-chart-5/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Vessel Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-chart-5">{avgVesselRisk.toFixed(2)}</div>
                  <Progress value={avgVesselRisk * 100} className="h-2 mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">{vessels.length} vessels</p>
                </CardContent>
              </Card>
            </div>

            {/* Live Correlation Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-chart-1" />
                  Live Correlation Metrics
                </CardTitle>
                <CardDescription>Real-time multi-source correlation analysis with automatic threshold monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {correlationMetrics.map((metric, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{metric.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {metric.value.toFixed(1)} / {metric.threshold}
                          </span>
                          <Badge
                            variant={
                              metric.status === 'critical'
                                ? 'destructive'
                                : metric.status === 'warning'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="text-xs"
                          >
                            {metric.status}
                          </Badge>
                        </div>
                      </div>
                      <Progress
                        value={(metric.value / (metric.threshold * 2)) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Live Fusion-Generated Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Live Fusion-Generated Alerts
                </CardTitle>
                <CardDescription>Real-time alerts triggered by multi-source correlation rules</CardDescription>
              </CardHeader>
              <CardContent>
                {fusionAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No fusion alerts at this time. System monitoring continues.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fusionAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-500"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            <span className="font-semibold text-destructive">{alert.type}</span>
                            <Badge variant="outline" className="text-xs">Fusion</Badge>
                          </div>
                          <Badge variant="destructive">Severity {alert.severity}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {alert.sources.map((source, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Multi-Source Correlation Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Multi-Source Correlation Matrix</CardTitle>
                <CardDescription>Live intelligence correlation across all modules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 text-center hover:bg-muted transition-colors">
                    <div className="text-2xl font-bold text-chart-1">
                      {satelliteData.filter(d => d.clusterFlag).length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Vessel Clusters</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center hover:bg-muted transition-colors">
                    <div className="text-2xl font-bold text-chart-2">
                      {coralData.filter(isCoralEmergency).length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Coral Emergencies</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center hover:bg-muted transition-colors">
                    <div className="text-2xl font-bold text-chart-3">
                      {aisData.filter(isHighRiskAIS).length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">High-Risk Vessels</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center hover:bg-muted transition-colors">
                    <div className="text-2xl font-bold text-chart-4">
                      {iotData.filter(isHighRiskIoT).length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Sensor Anomalies</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center hover:bg-muted transition-colors">
                    <div className="text-2xl font-bold text-chart-5">
                      {satelliteData.filter(d => d.pollutionFlag).length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Pollution Areas</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center hover:bg-muted transition-colors">
                    <div className="text-2xl font-bold text-destructive">
                      {satelliteData.filter(isMpaViolation).length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">MPA Violations</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6 mt-6">
            {currentRecommendations ? (
              <>
                {/* Situation Summary */}
                <Card className="border-chart-1/50 bg-gradient-to-br from-chart-1/5 to-chart-2/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-chart-1" />
                      Situation Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {currentRecommendations.situationSummary}
                    </p>
                  </CardContent>
                </Card>

                {/* Risk Assessment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-chart-3" />
                      Risk Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">Severity Level</div>
                        <Badge 
                          variant={
                            currentRecommendations.riskAssessment.severityLevel === 'Critical' ? 'destructive' :
                            currentRecommendations.riskAssessment.severityLevel === 'High' ? 'secondary' :
                            'outline'
                          }
                          className="text-sm"
                        >
                          {currentRecommendations.riskAssessment.severityLevel}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">Confidence Score</div>
                        <div className="text-2xl font-bold text-chart-1">
                          {(currentRecommendations.riskAssessment.confidenceScore * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">Risk Type</div>
                        <div className="text-sm font-medium">
                          {currentRecommendations.riskAssessment.riskType}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">Overall Risk</div>
                        <Badge variant="outline" className="text-sm">
                          {currentRecommendations.riskAssessment.overallRisk}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actionable Steps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-chart-4" />
                      Actionable Steps
                    </CardTitle>
                    <CardDescription>Recommended mitigation and response actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {currentRecommendations.actionableSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-lg bg-muted/50 border border-border space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-chart-4" />
                              <span className="font-medium">{step.action}</span>
                            </div>
                            <Badge
                              variant={
                                step.priority === 'High' ? 'destructive' :
                                step.priority === 'Medium' ? 'secondary' :
                                'outline'
                              }
                              className="text-xs"
                            >
                              {step.priority} Priority
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">
                            {step.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Responsible Stakeholders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-chart-5" />
                      Responsible Stakeholders
                    </CardTitle>
                    <CardDescription>Suggested authorities and agencies for coordination</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentRecommendations.responsibleStakeholders.map((stakeholder, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-lg bg-muted/50 border border-border space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-chart-5" />
                            <span className="font-medium">{stakeholder.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs mb-2">
                              {stakeholder.type}
                            </Badge>
                            <div className="mt-1">{stakeholder.contactInfo}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Confidence Levels */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-chart-2" />
                      Confidence Levels
                    </CardTitle>
                    <CardDescription>Data quality and assessment confidence by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {currentRecommendations.confidenceLevels.map((level, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{level.category}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {(level.value * 100).toFixed(0)}%
                              </span>
                              <Badge
                                variant={
                                  level.indicator === 'High' ? 'default' :
                                  level.indicator === 'Medium' ? 'secondary' :
                                  'outline'
                                }
                                className="text-xs"
                              >
                                {level.indicator}
                              </Badge>
                            </div>
                          </div>
                          <Progress value={level.value * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Lightbulb className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No AI Recommendations Available</p>
                    <p className="text-sm">
                      AI recommendations will be generated automatically when fusion analysis detects significant risk patterns or correlations.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Fusion History Tab */}
          <TabsContent value="history" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Fusion Analysis History</CardTitle>
                <CardDescription>Previously saved fusion analysis snapshots with AI recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                {fusionHistoryLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading fusion history...</div>
                ) : fusionHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium mb-2">No fusion analyses saved yet</p>
                    <p className="text-sm">Click "Save Snapshot" to record the current fusion analysis state.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {fusionHistory.map((record) => (
                      <div
                        key={record.id}
                        className="p-4 rounded-lg bg-muted/50 space-y-3 border border-border hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Network className="w-4 h-4 text-chart-5" />
                            <span className="font-medium text-sm">Fusion Analysis Snapshot</span>
                            {record.aiRecommendations && (
                              <Badge variant="secondary" className="text-xs">
                                <Lightbulb className="w-3 h-3 mr-1" />
                                AI Recommendations
                              </Badge>
                            )}
                          </div>
                          <Badge variant={record.fusionRiskScore >= 7 ? 'destructive' : record.fusionRiskScore >= 4 ? 'secondary' : 'outline'}>
                            Risk: {record.fusionRiskScore.toFixed(2)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>Global Risk: {record.globalRiskScore.toFixed(2)}</div>
                          <div>Alerts: {Number(record.alertsGenerated)}</div>
                        </div>
                        
                        {record.aiRecommendations && (
                          <div className="pt-2 border-t border-border/50 space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">AI Recommendations Summary:</div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Risk Type:</span> {record.aiRecommendations.riskAssessment.riskType}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Severity:</span> {record.aiRecommendations.riskAssessment.severityLevel} • 
                              <span className="ml-1">Confidence: {(record.aiRecommendations.riskAssessment.confidenceScore * 100).toFixed(0)}%</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Actions:</span> {record.aiRecommendations.actionableSteps.length} recommended steps
                            </div>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          {record.correlations.parameters}
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t border-border/50">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(Number(record.timestamp) / 1_000_000).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
