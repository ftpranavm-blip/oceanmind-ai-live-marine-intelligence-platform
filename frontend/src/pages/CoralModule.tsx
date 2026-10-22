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
import { isCoralAlert } from '../lib/risk';
import { CRW_EXTRACT, crwReadingForRegion } from '../lib/crwReading';
import {
  changeRegion,
  coralRisk,
  coralSavePayload,
  editValue,
  initialCoralForm,
  loadCrwReading,
  setSimulatedReading,
  sourceLabel,
} from '../lib/coralForm';

export default function CoralModule() {
  const [form, setForm] = useState(initialCoralForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const saveAnalysis = useSaveCoralAnalysis();
  const { data: analyses = [], isLoading } = useGetCoralAnalysisHistory();
  const { data: coralRegions = [] } = useGetCoralRegionCoordinates();

  const calculateRiskScore = () => coralRisk(form);
  const selectRegion = (regionId: string) => setForm(f => changeRegion(f, regionId));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setImageFile(file);
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

    setForm(f => setSimulatedReading(f, simulatedBleaching, simulatedStress));

    setAnalyzing(false);
    toast.success('Simulated bleaching reading generated.');
  };

  // Loads the bundled NOAA CRW extract (ERDDAP blocks browser requests via CORS).
  const selectedCrw = crwReadingForRegion(form.regionId);

  const handleCrwLoad = () => {
    if (!selectedCrw) {
      toast.error('No NOAA CRW reading for this region in the bundled extract');
      return;
    }
    setForm(loadCrwReading);
    toast.success(`Loaded ${selectedCrw.label}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRegionData = coralRegions.find(r => r.id === form.regionId);
    const regionName = selectedRegionData?.name || form.regionId;
    const payload = coralSavePayload(form, regionName, imageFile ? imageFile.name : null);

    try {
      await saveAnalysis.mutateAsync(payload);

      if (payload.alertStatus) {
        toast.success('Reef emergency alert automatically generated!');
      } else {
        toast.success('Coral analysis saved successfully');
      }

      setForm(f => initialCoralForm(f.regionId));
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
            <p className="text-muted-foreground">Bleaching and thermal stress risk scoring from NOAA Coral Reef Watch data or simulated readings</p>
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
              <CardTitle>Coral Analysis</CardTitle>
              <CardDescription>Load a dated NOAA Coral Reef Watch reading, or generate a simulated image reading (no image model is used)</CardDescription>
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
                    NOAA CRW
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="coralRegion">Coral Reef Region</Label>
                    <Select value={form.regionId} onValueChange={selectRegion}>
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
                    <Select value={form.regionId} onValueChange={selectRegion}>
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
                    <div className="font-medium">NOAA Coral Reef Watch, data from {CRW_EXTRACT.date}</div>
                    <div className="text-xs text-muted-foreground">
                      Bundled extract of the daily 5 km products (browsers cannot call NOAA ERDDAP directly).
                      Refresh with scripts/update-crw-extract.mts.
                    </div>
                    {selectedCrw ? (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-xs">
                        <span>Degree Heating Weeks: {selectedCrw.reading.dhw.toFixed(2)} °C-weeks</span>
                        <span>Bleaching Alert Area: level {selectedCrw.reading.baa} of 4</span>
                        <span>HotSpot: {selectedCrw.reading.hotspot.toFixed(2)} °C</span>
                        <span>SST anomaly: {selectedCrw.reading.sstAnomaly.toFixed(2)} °C</span>
                        <span className="col-span-2 text-muted-foreground">
                          Cell {selectedCrw.reading.cell.lat}, {selectedCrw.reading.cell.lon}
                          {selectedCrw.reading.distanceKm > 0 ? ` (nearest water cell, ${selectedCrw.reading.distanceKm.toFixed(1)} km away)` : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground pt-2">No reading for this region in the extract.</div>
                    )}
                  </div>

                  <Button onClick={handleCrwLoad} disabled={!selectedCrw} className="w-full">
                    Load NOAA CRW Reading
                  </Button>
                </TabsContent>
              </Tabs>

              <form onSubmit={handleSubmit} className="space-y-4 mt-6 pt-6 border-t">
                <div className="space-y-2">
                  <Label htmlFor="bleachingProb">Bleaching Score (0-10)</Label>
                  <Input
                    id="bleachingProb"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={form.bleaching}
                    onChange={(e) => setForm(f => editValue(f, 'bleaching', e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    From CRW: max(Bleaching Alert Area level x 2.5, 7.5 at DHW &gt;= 4, 10 at DHW &gt;= 8)
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
                    value={form.thermalStress}
                    onChange={(e) => setForm(f => editValue(f, 'thermalStress', e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    From CRW: min(Degree Heating Weeks / 8, 1) x 10
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">Source:</span>
                    <Badge variant="outline">{sourceLabel(form.source)}</Badge>
                  </div>
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
                  No analyses yet. Load a NOAA CRW reading or generate a simulated one to start.
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
