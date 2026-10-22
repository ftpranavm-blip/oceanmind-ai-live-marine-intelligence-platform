import { useState, useEffect } from 'react';
import { useSaveCoralAnalysis, useGetCoralAnalysisHistory, useGetCoralRegionCoordinates } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Waves, Thermometer, AlertTriangle, Upload, Satellite } from 'lucide-react';
import { toast } from 'sonner';
import { coralRiskScore, isCoralAlert } from '../lib/risk';

export default function CoralModule() {
  const [bleachingProb, setBleachingProb] = useState('0');
  const [thermalStress, setThermalStress] = useState('0');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('great_barrier_reef');
  const [dataType, setDataType] = useState<'image' | 'sst'>('image');

  // NOAA Coral Reef Watch simulation
  const [fetchingNoaa, setFetchingNoaa] = useState(false);

  const saveAnalysis = useSaveCoralAnalysis();
  const { data: analyses = [], isLoading } = useGetCoralAnalysisHistory();
  const { data: coralRegions = [] } = useGetCoralRegionCoordinates();

  const calculateRiskScore = () =>
    coralRiskScore(parseFloat(bleachingProb) || 0, parseFloat(thermalStress) || 0);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setImageFile(file);
    setDataType('image');
    toast.success('Coral image uploaded. Ready for AI analysis.');
  };

  const handleImageAnalysis = async () => {
    if (!imageFile) {
      toast.error('Please upload a coral image first');
      return;
    }

    setAnalyzing(true);
    toast.info('Generating simulated bleaching reading...');

    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2500));

    const simulatedBleaching = (Math.random() * 10).toFixed(1);
    const simulatedStress = (Math.random() * 10).toFixed(1);

    setBleachingProb(simulatedBleaching);
    setThermalStress(simulatedStress);

    setAnalyzing(false);
    toast.success('Simulated bleaching reading generated.');
  };

  const handleNoaaFetch = async () => {
    setFetchingNoaa(true);
    setDataType('sst');
    toast.info('Generating simulated temperature reading...');

    // Simulate NOAA API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    const simulatedTemp = (26 + Math.random() * 6).toFixed(1);
    const tempValue = parseFloat(simulatedTemp);
    const stressValue = tempValue > 30 ? ((tempValue - 30) * 2).toFixed(1) : '0';

    setThermalStress(stressValue);
    
    // Estimate bleaching based on temperature
    const bleachingEstimate = tempValue > 30 ? ((tempValue - 28) * 1.5).toFixed(1) : (Math.random() * 3).toFixed(1);
    setBleachingProb(bleachingEstimate);

    setFetchingNoaa(false);
    toast.success(`Simulated temperature: ${simulatedTemp}°C`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const riskScore = calculateRiskScore();
    const alertStatus = isCoralAlert(riskScore);

    const selectedRegionData = coralRegions.find(r => r.id === selectedRegion);
    const regionName = selectedRegionData?.name || selectedRegion;

    try {
      await saveAnalysis.mutateAsync({
        imageId: imageFile ? imageFile.name : null,
        bleachingProbability: parseFloat(bleachingProb) || 0,
        thermalStress: parseFloat(thermalStress) || 0,
        riskScore,
        alertStatus,
        region: regionName,
        dataType: dataType === 'image' ? 'Image Analysis' : 'SST Data',
      });

      if (alertStatus) {
        toast.success('Reef emergency alert automatically generated!');
      } else {
        toast.success('Coral analysis saved successfully');
      }

      setBleachingProb('0');
      setThermalStress('0');
      setImageFile(null);
    } catch (error) {
      toast.error('Failed to save coral analysis');
      console.error('Error saving coral analysis:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-chart-2 to-chart-3 flex items-center justify-center">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Coral Intelligence Module</h1>
            <p className="text-muted-foreground">Bleaching and thermal stress risk scoring (simulated readings)</p>
          </div>
        </div>

        {/* Hero Image */}
        <Card>
          <CardContent className="p-0">
            <img
              src="/assets/generated/coral-reef-comparison.dim_800x600.jpg"
              alt="Coral Reef Comparison"
              className="w-full h-64 object-cover rounded-lg"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Analysis Input */}
          <Card>
            <CardHeader>
              <CardTitle>Coral Analysis (Simulated)</CardTitle>
              <CardDescription>Upload an image or generate a simulated reading; no image model or NOAA call is used</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="upload" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </TabsTrigger>
                  <TabsTrigger value="noaa">
                    <Satellite className="w-4 h-4 mr-2" />
                    Simulated NOAA
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="coralRegion">Coral Reef Region</Label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {coralRegions.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coralImage">Coral Image</Label>
                    <Input
                      id="coralImage"
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
                    {analyzing ? 'Generating...' : 'Generate Simulated Reading'}
                  </Button>
                </TabsContent>

                <TabsContent value="noaa" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="noaaRegion">Coral Reef Region</Label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {coralRegions.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                    <div className="font-medium">Simulated NOAA Coral Reef Watch reading</div>
                    <div className="text-xs text-muted-foreground">
                      Sea surface temperature and thermal stress are generated randomly, not fetched
                    </div>
                  </div>

                  <Button
                    onClick={handleNoaaFetch}
                    disabled={fetchingNoaa}
                    className="w-full"
                  >
                    {fetchingNoaa ? 'Generating...' : 'Generate Simulated Temperature'}
                  </Button>
                </TabsContent>
              </Tabs>

              <form onSubmit={handleSubmit} className="space-y-4 mt-6 pt-6 border-t">
                <div className="space-y-2">
                  <Label htmlFor="bleachingProb">Bleaching Probability (0-10)</Label>
                  <Input
                    id="bleachingProb"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={bleachingProb}
                    onChange={(e) => setBleachingProb(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    AI-based bleaching detection score
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thermalStress">Thermal Stress Index (0-10)</Label>
                  <Input
                    id="thermalStress"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={thermalStress}
                    onChange={(e) => setThermalStress(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Based on NOAA temperature data
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Calculated Risk Score:</span>
                    <Badge variant={isCoralAlert(calculateRiskScore()) ? 'destructive' : 'secondary'}>
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
              <CardDescription>Recent coral health assessments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : analyses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No analyses yet. Generate a simulated reading to start.
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {analyses.map((analysis, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-muted/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Waves className="w-4 h-4 text-chart-2" />
                          <span className="font-medium text-sm">{analysis.region}</span>
                        </div>
                        <Badge variant={isCoralAlert(analysis.riskScore) ? 'destructive' : 'secondary'}>
                          Risk: {analysis.riskScore.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {analysis.dataType} • {new Date(Number(analysis.timestamp) / 1000000).toLocaleString()}
                      </div>
                      {analysis.imageId && (
                        <div className="text-xs text-muted-foreground">
                          Image: {analysis.imageId}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-chart-4" />
                          <span className="text-muted-foreground">Bleaching:</span>
                          <span className="font-medium">{analysis.bleachingProbability.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Thermometer className="w-3 h-3 text-destructive" />
                          <span className="text-muted-foreground">Stress:</span>
                          <span className="font-medium">{analysis.thermalStress.toFixed(1)}</span>
                        </div>
                      </div>
                      {analysis.alertStatus && (
                        <div className="flex items-center gap-2 text-xs text-destructive">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Reef emergency alert generated</span>
                        </div>
                      )}
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
