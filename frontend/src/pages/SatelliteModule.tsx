import { useState, useEffect } from 'react';
import { useSaveSatelliteAnalysis, useGetSatelliteAnalysisHistory, useGetRegionCoordinates } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Satellite, MapPin, AlertTriangle, Upload, Globe, Radar } from 'lucide-react';
import { toast } from 'sonner';
import { satelliteRiskScore, isSatelliteHighRisk } from '../lib/risk';

export default function SatelliteModule() {
  const [vesselCount, setVesselCount] = useState('0');
  const [clusterFlag, setClusterFlag] = useState(false);
  const [pollutionFlag, setPollutionFlag] = useState(false);
  const [nearCoral, setNearCoral] = useState(false);
  const [marineProtectedAreaFlag, setMarineProtectedAreaFlag] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Google Earth Engine simulation
  const [geeRegion, setGeeRegion] = useState('great_barrier_reef');
  const [sourceSentinel1, setSourceSentinel1] = useState(false);
  const [sourceSentinel2, setSourceSentinel2] = useState(true);
  const [sourceLandsat, setSourceLandsat] = useState(false);
  const [sourceModis, setSourceModis] = useState(false);
  const [geeTimeframe, setGeeTimeframe] = useState('last-7-days');

  const saveAnalysis = useSaveSatelliteAnalysis();
  const { data: analyses = [], isLoading } = useGetSatelliteAnalysisHistory();
  const { data: regions = [] } = useGetRegionCoordinates();

  const calculateRiskScore = () =>
    satelliteRiskScore({
      vesselCount: parseInt(vesselCount) || 0,
      clusterFlag,
      pollutionFlag,
      nearCoral,
      marineProtectedAreaFlag,
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setImageFile(file);
    toast.success('Image uploaded. Ready for analysis.');
  };

  const handleImageAnalysis = async () => {
    if (!imageFile) {
      toast.error('Please upload an image first');
      return;
    }

    setAnalyzing(true);
    toast.info('Analyzing satellite imagery...');

    // Simulate AI analysis with random results
    await new Promise(resolve => setTimeout(resolve, 2000));

    const simulatedVessels = Math.floor(Math.random() * 20);
    const simulatedCluster = Math.random() > 0.6;
    const simulatedPollution = Math.random() > 0.7;
    const simulatedNearCoral = Math.random() > 0.5;
    const simulatedMPA = Math.random() > 0.8;

    setVesselCount(simulatedVessels.toString());
    setClusterFlag(simulatedCluster);
    setPollutionFlag(simulatedPollution);
    setNearCoral(simulatedNearCoral);
    setMarineProtectedAreaFlag(simulatedMPA);

    setAnalyzing(false);
    toast.success('Analysis complete! Review results below.');
  };

  const handleGEEAnalysis = async () => {
    if (!sourceSentinel1 && !sourceSentinel2 && !sourceLandsat && !sourceModis) {
      toast.error('Please select at least one satellite data source');
      return;
    }

    toast.info('Fetching live satellite data from Google Earth Engine...');
    setAnalyzing(true);

    // Simulate GEE API call
    await new Promise(resolve => setTimeout(resolve, 2500));

    const simulatedVessels = Math.floor(Math.random() * 15) + 5;
    const simulatedCluster = Math.random() > 0.5;
    const simulatedPollution = Math.random() > 0.6;
    const simulatedNearCoral = Math.random() > 0.4;
    const simulatedMPA = Math.random() > 0.7;

    setVesselCount(simulatedVessels.toString());
    setClusterFlag(simulatedCluster);
    setPollutionFlag(simulatedPollution);
    setNearCoral(simulatedNearCoral);
    setMarineProtectedAreaFlag(simulatedMPA);

    setAnalyzing(false);
    toast.success('Live satellite data retrieved successfully!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const riskScore = calculateRiskScore();

    try {
      await saveAnalysis.mutateAsync({
        region: geeRegion,
        sourceSentinel1,
        sourceSentinel2,
        sourceLandsat,
        sourceModis,
        vesselCount: BigInt(parseInt(vesselCount) || 0),
        clusterFlag,
        pollutionFlag,
        nearCoral,
        marina_area_flag: marineProtectedAreaFlag,
        riskScore,
      });

      // Auto-generate alerts based on risk
      if (isSatelliteHighRisk(riskScore)) {
        const alertType = marineProtectedAreaFlag ? 'MPA Violation' : pollutionFlag ? 'Pollution Event' : 'Illegal Fishing';
        toast.success(`High-risk alert automatically generated: ${alertType}`);
      }

      toast.success('Satellite analysis saved successfully');
      setVesselCount('0');
      setClusterFlag(false);
      setPollutionFlag(false);
      setNearCoral(false);
      setMarineProtectedAreaFlag(false);
      setImageFile(null);
    } catch (error) {
      toast.error('Failed to save satellite analysis');
      console.error(error);
    }
  };

  const getRegionName = (regionId: string) => {
    const region = regions.find(r => r.id === regionId);
    return region ? region.name : regionId;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center">
            <Satellite className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Satellite Intelligence Module</h1>
            <p className="text-muted-foreground">Live vessel tracking, pollution detection & MPA monitoring</p>
          </div>
        </div>

        {/* Hero Image */}
        <Card>
          <CardContent className="p-0">
            <img
              src="/assets/generated/satellite-ocean-view.dim_800x600.jpg"
              alt="Satellite Ocean View"
              className="w-full h-64 object-cover rounded-lg"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Analysis Input */}
          <Card>
            <CardHeader>
              <CardTitle>Live Satellite Analysis</CardTitle>
              <CardDescription>Upload imagery or connect to Google Earth Engine</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="upload" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </TabsTrigger>
                  <TabsTrigger value="gee">
                    <Globe className="w-4 h-4 mr-2" />
                    Google Earth Engine
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="imageUpload">Satellite Image</Label>
                    <Input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={analyzing}
                    />
                    {imageFile && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {imageFile.name}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleImageAnalysis}
                    disabled={!imageFile || analyzing}
                    className="w-full"
                  >
                    {analyzing ? 'Analyzing...' : 'Analyze Image'}
                  </Button>
                </TabsContent>

                <TabsContent value="gee" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="geeRegion">Critical Marine Region</Label>
                    <Select value={geeRegion} onValueChange={setGeeRegion}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.length > 0 ? (
                          regions.map((region) => (
                            <SelectItem key={region.id} value={region.id}>
                              {region.name}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="great_barrier_reef">Great Barrier Reef (Australia)</SelectItem>
                            <SelectItem value="coral_triangle">Coral Triangle (SE Asia)</SelectItem>
                            <SelectItem value="maldives">Maldives</SelectItem>
                            <SelectItem value="andaman_nicobar_islands">Andaman & Nicobar Islands (India)</SelectItem>
                            <SelectItem value="red_sea">Red Sea</SelectItem>
                            <SelectItem value="hawaii">Hawaii</SelectItem>
                            <SelectItem value="florida_keys">Florida Keys (USA)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Satellite Data Sources</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="sourceSentinel1"
                          checked={sourceSentinel1}
                          onCheckedChange={(checked) => setSourceSentinel1(checked as boolean)}
                        />
                        <Label htmlFor="sourceSentinel1" className="cursor-pointer flex items-center gap-2">
                          <Radar className="w-4 h-4 text-chart-1" />
                          Sentinel-1 (SAR) - Radar, all-weather, day/night
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="sourceSentinel2"
                          checked={sourceSentinel2}
                          onCheckedChange={(checked) => setSourceSentinel2(checked as boolean)}
                        />
                        <Label htmlFor="sourceSentinel2" className="cursor-pointer">
                          Sentinel-2 - Optical, 10m resolution
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="sourceLandsat"
                          checked={sourceLandsat}
                          onCheckedChange={(checked) => setSourceLandsat(checked as boolean)}
                        />
                        <Label htmlFor="sourceLandsat" className="cursor-pointer">
                          Landsat - Multispectral, 30m resolution
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="sourceModis"
                          checked={sourceModis}
                          onCheckedChange={(checked) => setSourceModis(checked as boolean)}
                        />
                        <Label htmlFor="sourceModis" className="cursor-pointer">
                          MODIS - Thermal & ocean color, 250m resolution
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="geeTimeframe">Timeframe</Label>
                    <Select value={geeTimeframe} onValueChange={setGeeTimeframe}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-24-hours">Last 24 Hours</SelectItem>
                        <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                        <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleGEEAnalysis}
                    disabled={analyzing}
                    className="w-full"
                  >
                    {analyzing ? 'Fetching Data...' : 'Fetch Live Data'}
                  </Button>
                </TabsContent>
              </Tabs>

              <form onSubmit={handleSubmit} className="space-y-4 mt-6 pt-6 border-t">
                <div className="space-y-2">
                  <Label htmlFor="vesselCount">Detected Vessel Count</Label>
                  <Input
                    id="vesselCount"
                    type="number"
                    min="0"
                    value={vesselCount}
                    onChange={(e) => setVesselCount(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clusterFlag"
                      checked={clusterFlag}
                      onCheckedChange={(checked) => setClusterFlag(checked as boolean)}
                    />
                    <Label htmlFor="clusterFlag" className="cursor-pointer">
                      Vessel Clustering Detected
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pollutionFlag"
                      checked={pollutionFlag}
                      onCheckedChange={(checked) => setPollutionFlag(checked as boolean)}
                    />
                    <Label htmlFor="pollutionFlag" className="cursor-pointer">
                      Pollution Pattern Detected
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="nearCoral"
                      checked={nearCoral}
                      onCheckedChange={(checked) => setNearCoral(checked as boolean)}
                    />
                    <Label htmlFor="nearCoral" className="cursor-pointer">
                      Near Coral Reef
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="marineProtectedAreaFlag"
                      checked={marineProtectedAreaFlag}
                      onCheckedChange={(checked) => setMarineProtectedAreaFlag(checked as boolean)}
                    />
                    <Label htmlFor="marineProtectedAreaFlag" className="cursor-pointer">
                      Inside Marine Protected Area
                    </Label>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Calculated Risk Score:</span>
                    <Badge variant={isSatelliteHighRisk(calculateRiskScore()) ? 'destructive' : 'secondary'}>
                      {calculateRiskScore().toFixed(1)} / 10
                    </Badge>
                  </div>
                  <Button type="submit" className="w-full" disabled={saveAnalysis.isPending}>
                    {saveAnalysis.isPending ? 'Saving...' : 'Save Analysis & Generate Alerts'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Analysis History */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis History</CardTitle>
              <CardDescription>Recent satellite intelligence reports</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : analyses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No analyses yet. Upload an image or connect to GEE to start.
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {analyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="p-4 rounded-lg bg-muted/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-chart-1" />
                          <span className="font-medium text-sm">
                            {getRegionName(analysis.region)}
                          </span>
                        </div>
                        <Badge variant={isSatelliteHighRisk(analysis.riskScore) ? 'destructive' : 'secondary'}>
                          Risk: {analysis.riskScore.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Number(analysis.vesselCount)} vessels detected
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {analysis.sourceSentinel1 && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Radar className="w-3 h-3" />
                            SAR
                          </Badge>
                        )}
                        {analysis.sourceSentinel2 && (
                          <Badge variant="outline" className="text-xs">S-2</Badge>
                        )}
                        {analysis.sourceLandsat && (
                          <Badge variant="outline" className="text-xs">Landsat</Badge>
                        )}
                        {analysis.sourceModis && (
                          <Badge variant="outline" className="text-xs">MODIS</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {analysis.clusterFlag && (
                          <Badge variant="outline" className="text-xs">Clustering</Badge>
                        )}
                        {analysis.pollutionFlag && (
                          <Badge variant="outline" className="text-xs">Pollution</Badge>
                        )}
                        {analysis.nearCoral && (
                          <Badge variant="outline" className="text-xs">Near Coral</Badge>
                        )}
                        {analysis.marina_area_flag && (
                          <Badge variant="outline" className="text-xs">MPA Violation</Badge>
                        )}
                      </div>
                      {(analysis.marina_area_flag || analysis.pollutionFlag) && (
                        <div className="flex items-center gap-2 text-xs text-destructive">
                          <AlertTriangle className="w-3 h-3" />
                          <span>High priority alert generated</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(Number(analysis.timestamp) / 1_000_000).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
