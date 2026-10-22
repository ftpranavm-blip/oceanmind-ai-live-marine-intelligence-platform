import { useGetAllAlerts, useGetAllRiskScores, useGetSatelliteAnalysisHistory, useGetCoralAnalysisHistory, useGetAISAnalysisHistory, useGetIoTAnalysisHistory, useGetMapData } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Satellite, Waves, Ship, Thermometer, Network, AlertTriangle, TrendingUp, Activity, MapPin } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Progress } from '@/components/ui/progress';
import { averageRisk, moduleSeverityBand } from '../lib/risk';
import { globalMarineRiskIndex } from '../lib/fusion';

export default function CommandCenter() {
  const navigate = useNavigate();
  const { data: alerts = [] } = useGetAllAlerts();
  const { data: riskScores = [] } = useGetAllRiskScores();
  const { data: satelliteData = [] } = useGetSatelliteAnalysisHistory();
  const { data: coralData = [] } = useGetCoralAnalysisHistory();
  const { data: aisData = [] } = useGetAISAnalysisHistory();
  const { data: iotData = [] } = useGetIoTAnalysisHistory();
  const { data: mapData } = useGetMapData();

  const vessels = mapData?.vessels || [];
  const activeAlerts = alerts.filter((a) => Number(a.severity) >= 5);
  const criticalAlerts = alerts.filter((a) => Number(a.severity) >= 8);
  const fusionAlerts = alerts.filter((a) => a.type === 'Fusion');

  // Calculate Global Marine Risk Index
  const avgSatelliteRisk = averageRisk(satelliteData);
  const avgCoralRisk = averageRisk(coralData);
  const avgAISRisk = averageRisk(aisData);
  const avgIoTRisk = averageRisk(iotData);
  const globalRiskIndex = globalMarineRiskIndex({
    satellite: satelliteData,
    coral: coralData,
    ais: aisData,
    iot: iotData,
    vessels,
  });
  const globalRiskBand = moduleSeverityBand(globalRiskIndex);

  const modules = [
    {
      title: 'Satellite Intelligence',
      icon: Satellite,
      path: '/satellite',
      description: 'Vessel & MPA risk scoring (simulated)',
      color: 'from-chart-1 to-chart-2',
      image: '/assets/generated/satellite-ocean-view.dim_800x600.jpg',
      riskScore: avgSatelliteRisk,
      dataCount: satelliteData.length,
    },
    {
      title: 'Coral Intelligence',
      icon: Waves,
      path: '/coral',
      description: 'Bleaching & thermal stress scoring (simulated)',
      color: 'from-chart-2 to-chart-3',
      image: '/assets/generated/coral-reef-comparison.dim_800x600.jpg',
      riskScore: avgCoralRisk,
      dataCount: coralData.length,
    },
    {
      title: 'AIS Intelligence',
      icon: Ship,
      path: '/ais',
      description: 'Vessel behaviour risk scoring (simulated)',
      color: 'from-chart-3 to-chart-4',
      image: '/assets/generated/ais-vessel-tracking.dim_600x400.jpg',
      riskScore: avgAISRisk,
      dataCount: aisData.length,
    },
    {
      title: 'IoT Ocean Sensors',
      icon: Thermometer,
      path: '/iot',
      description: 'Ocean parameter scoring (simulated)',
      color: 'from-chart-4 to-chart-5',
      image: '/assets/generated/iot-ocean-sensor.dim_600x400.jpg',
      riskScore: avgIoTRisk,
      dataCount: iotData.length,
    },
    {
      title: 'Live Ocean Map',
      icon: MapPin,
      path: '/live-ocean-map',
      description: 'Map of sample vessels',
      color: 'from-chart-1 to-chart-3',
      image: '/assets/generated/global-ocean-risk-map.dim_1000x600.jpg',
      riskScore: 0,
      dataCount: vessels.length,
    },
    {
      title: 'Fusion Engine',
      icon: Network,
      path: '/fusion',
      description: 'Multi-source risk integration',
      color: 'from-chart-5 to-chart-1',
      image: '/assets/generated/data-fusion-network.dim_800x600.jpg',
      riskScore: globalRiskIndex,
      dataCount: satelliteData.length + coralData.length + aisData.length + iotData.length,
    },
    {
      title: 'Alert Management',
      icon: AlertTriangle,
      path: '/alerts',
      description: 'Incident tracking & response',
      color: 'from-destructive to-chart-1',
      image: '/assets/generated/marine-alerts-dashboard.dim_800x600.jpg',
      riskScore: 0,
      dataCount: alerts.length,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-chart-1/10 via-transparent to-chart-2/10" />
        <div className="relative px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-chart-1 to-chart-2 bg-clip-text text-transparent">
              Live Command Center
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Real-time marine intelligence with continuous backend updates every 8 seconds
            </p>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto space-y-8">
        {/* Global Marine Risk Index */}
        <Card className="border-chart-1/50 bg-gradient-to-br from-chart-1/10 to-chart-2/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-chart-1" />
              Global Marine Risk Index
            </CardTitle>
            <CardDescription>Live aggregated risk from all intelligence modules including Fusion Engine</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-5xl font-bold text-chart-1">
                  {globalRiskIndex.toFixed(2)}
                </span>
                <Badge 
                  variant={globalRiskBand === 'Critical' ? 'destructive' : 'secondary'} 
                  className="text-lg px-4 py-2"
                >
                  {globalRiskBand}
                </Badge>
              </div>
              <Progress value={globalRiskIndex * 10} className="h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                {criticalAlerts.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Severity ≥ 8</p>
            </CardContent>
          </Card>

          <Card className="border-chart-4/50 bg-chart-4/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-chart-4" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-chart-4">
                {activeAlerts.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Severity ≥ 5</p>
            </CardContent>
          </Card>

          <Card className="border-chart-1/50 bg-chart-1/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Network className="w-4 h-4 text-chart-1" />
                Fusion Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-chart-1">
                {fusionAlerts.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Multi-source correlation</p>
            </CardContent>
          </Card>

          <Card className="border-chart-2/50 bg-chart-2/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Network className="w-4 h-4 text-chart-2" />
                Data Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-chart-2">
                {satelliteData.length + coralData.length + aisData.length + iotData.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Live feeds active</p>
            </CardContent>
          </Card>
        </div>

        {/* Module Grid with Live Indicators */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Intelligence Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Card
                  key={module.path}
                  className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
                  onClick={() => navigate({ to: module.path })}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={module.image}
                      alt={module.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-60`} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon className="w-12 h-12 text-white" />
                    </div>
                    {module.riskScore > 0 && (
                      <div className="absolute top-3 right-3">
                        <Badge variant={module.riskScore >= 7 ? 'destructive' : 'secondary'}>
                          Risk: {module.riskScore.toFixed(1)}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{module.title}</span>
                      {module.dataCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {module.dataCount}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Alerts Timeline */}
        {alerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Live Alert Timeline</CardTitle>
              <CardDescription>Latest incidents and risk notifications • Auto-refresh enabled every 8 seconds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {alert.type === 'Fusion' ? (
                        <Network className="w-5 h-5 text-chart-1" />
                      ) : (
                        <AlertTriangle
                          className={`w-5 h-5 ${
                            Number(alert.severity) >= 8
                              ? 'text-destructive'
                              : Number(alert.severity) >= 5
                                ? 'text-chart-4'
                                : 'text-muted-foreground'
                          }`}
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{alert.type}</span>
                          {alert.type === 'Fusion' && (
                            <Badge variant="outline" className="text-xs bg-chart-1/10 border-chart-1">
                              Fusion
                            </Badge>
                          )}
                        </div>
                        {alert.source && (
                          <div className="text-xs text-muted-foreground">Source: {alert.source}</div>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={Number(alert.severity) >= 8 ? 'destructive' : 'secondary'}
                    >
                      Severity {Number(alert.severity)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          © 2025. Built with love using{' '}
          <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
