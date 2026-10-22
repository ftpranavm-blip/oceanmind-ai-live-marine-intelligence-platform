import { useState } from 'react';
import { useSaveIoTAnalysis, useGetIoTAnalysisHistory } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Thermometer, Droplets, AlertTriangle, Upload, Waves, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { isIotAlert } from '../lib/risk';
import { IOT_STATIONS } from '../lib/iotStations';
import type { IotVariable } from '../lib/ndbc';
import {
  changeLocation,
  editRisk,
  initialIotForm,
  iotSavePayload,
  iotSourceLabel,
  loadNdbcReading,
  ndbcReadingForLocation,
  setSimulatedReading,
} from '../lib/iotForm';

const VARIABLE_LABELS: [IotVariable, string][] = [
  ['temperature', 'Water temperature'],
  ['ph', 'pH'],
  ['oxygen', 'Dissolved oxygen'],
  ['turbidity', 'Turbidity'],
];
const UNIT_LABELS: Record<string, string> = { degC: '°C', ppm: 'mg/L', '-': '', pH: '' };

export default function IoTModule() {
  const [form, setForm] = useState(initialIotForm);
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const saveAnalysis = useSaveIoTAnalysis();
  const { data: iotAnalyses = [], isLoading } = useGetIoTAnalysisHistory();

  const selectedReading = ndbcReadingForLocation(form.locationId);
  const riskScore = form.riskScore;

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setCSVFile(file);
    toast.success('IoT sensor CSV uploaded. Ready for analysis.');
  };

  const handleCSVAnalysis = async () => {
    if (!csvFile) {
      toast.error('Please upload a CSV file first');
      return;
    }

    setAnalyzing(true);
    toast.info('Generating simulated sensor reading...');

    // Simulate CSV parsing and analysis
    await new Promise(resolve => setTimeout(resolve, 2000));

    const simulatedRisk = (Math.random() * 10).toFixed(1);
    const sensor = {
      temperature: (20 + Math.random() * 15).toFixed(1),
      ph: (7.5 + Math.random() * 1).toFixed(2),
      turbidity: (Math.random() * 50).toFixed(1),
      oxygen: (5 + Math.random() * 5).toFixed(1),
    };
    setForm(f => setSimulatedReading(f, sensor, simulatedRisk));

    setAnalyzing(false);
    toast.success('Simulated sensor reading generated.');
  };

  // Loads the bundled NDBC extract (NDBC blocks browser requests via CORS).
  const handleNdbcLoad = () => {
    if (!selectedReading) {
      toast.error('No NDBC reading for this location in the bundled extract');
      return;
    }
    setForm(loadNdbcReading);
    toast.success(`Loaded ${selectedReading.label}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = iotSavePayload(form);

    try {
      await saveAnalysis.mutateAsync(payload);

      if (payload.alertStatus) {
        toast.success('Climate stress alert automatically generated!');
      } else {
        toast.success('IoT analysis saved successfully');
      }

      // Reset form
      setForm(f => initialIotForm(f.locationId));
      setCSVFile(null);
    } catch (error) {
      console.error('Failed to save IoT analysis:', error);
      toast.error('Failed to save IoT analysis');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-chart-4 to-chart-5 flex items-center justify-center">
            <Thermometer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">IoT Ocean Intelligence Module</h1>
            <p className="text-muted-foreground">Ocean parameter risk scoring from NOAA NDBC station data or simulated readings</p>
          </div>
        </div>

        {/* Hero Image */}
        <Card>
          <CardContent className="p-0">
            <img
              src="/assets/generated/iot-ocean-sensor.dim_600x400.jpg"
              alt="IoT Ocean Sensor"
              className="w-full h-64 object-cover rounded-lg"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Input */}
          <Card>
            <CardHeader>
              <CardTitle>IoT Data</CardTitle>
              <CardDescription>Load a dated NOAA NDBC station reading, or generate a simulated reading (uploaded CSVs are not parsed yet)</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="csv" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="csv">
                    <Upload className="w-4 h-4 mr-2" />
                    CSV Upload
                  </TabsTrigger>
                  <TabsTrigger value="buoy">
                    <Waves className="w-4 h-4 mr-2" />
                    NOAA NDBC
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="csv" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="csvUpload">Sensor Data CSV</Label>
                    <Input
                      id="csvUpload"
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      disabled={analyzing}
                    />
                    {csvFile && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {csvFile.name}
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                    <div className="font-medium">Expected CSV format:</div>
                    <div className="text-muted-foreground">
                      Timestamp, Temperature, pH, Turbidity, Oxygen
                    </div>
                  </div>
                  <Button
                    onClick={handleCSVAnalysis}
                    disabled={!csvFile || analyzing}
                    className="w-full"
                  >
                    {analyzing ? 'Generating...' : 'Generate Simulated Reading'}
                  </Button>
                </TabsContent>

                <TabsContent value="buoy" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="buoyLocation">Station</Label>
                    <Select value={form.locationId} onValueChange={(id) => setForm(f => changeLocation(f, id))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IOT_STATIONS.map((station) => (
                          <SelectItem key={station.id} value={station.id}>
                            {station.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                    <div className="font-medium">NOAA National Data Buoy Center</div>
                    <div className="text-xs text-muted-foreground">
                      Bundled extract of the newest values in NDBC's 45-day station files (browsers cannot call NDBC directly).
                      Refresh with scripts/update-ndbc-extract.mts.
                    </div>
                    {selectedReading ? (
                      <div className="space-y-1 pt-2 text-xs">
                        {VARIABLE_LABELS.map(([variable, label]) => {
                          const r = selectedReading.location.readings[variable];
                          return (
                            <div key={variable} className="flex items-center justify-between gap-2">
                              <span>{label}</span>
                              <span>
                                {r.value} {UNIT_LABELS[r.unit] ?? r.unit}{' '}
                                {r.source === 'ndbc' ? (
                                  <span className="text-muted-foreground">({r.column}, {r.time.slice(0, 16).replace('T', ' ')} UTC)</span>
                                ) : (
                                  <Badge variant="outline" className="text-xs">sample, not measured</Badge>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground pt-2">No reading for this station in the extract.</div>
                    )}
                  </div>

                  <Button onClick={handleNdbcLoad} disabled={!selectedReading} className="w-full">
                    Load NDBC Reading
                  </Button>
                </TabsContent>
              </Tabs>

              <form onSubmit={handleSubmit} className="space-y-4 mt-6 pt-6 border-t">
                <div className="space-y-2">
                  <Label htmlFor="riskScore">Sensor Risk Score (0-10)</Label>
                  <Input
                    id="riskScore"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={riskScore}
                    onChange={(e) => setForm(f => editRisk(f, e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Based on temperature, pH, turbidity, and oxygen levels
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">Source:</span>
                    <Badge variant="outline">{iotSourceLabel(form.source)}</Badge>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Alert Level:</span>
                    <Badge variant={parseFloat(riskScore) >= 7 ? 'destructive' : 'secondary'}>
                      {parseFloat(riskScore) >= 7 ? 'Critical' : parseFloat(riskScore) >= 4 ? 'Warning' : 'Normal'}
                    </Badge>
                  </div>
                  <Button type="submit" className="w-full" disabled={saveAnalysis.isPending}>
                    {saveAnalysis.isPending ? 'Saving...' : 'Save Data & Generate Alerts'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* IoT Data History */}
          <Card>
            <CardHeader>
              <CardTitle>IoT Data History</CardTitle>
              <CardDescription>Previously completed IoT analyses with timestamps and alert status</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : iotAnalyses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No IoT analyses yet. Load an NDBC reading or generate a simulated one to begin.
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {iotAnalyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="p-4 rounded-lg bg-muted/50 space-y-2 border border-border"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Droplets className="w-4 h-4 text-chart-4" />
                            <span className="font-medium text-sm">{analysis.dataModule}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Region: {analysis.region}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Data Type: {analysis.dataType}
                          </div>
                        </div>
                        <Badge variant={analysis.riskScore >= 7 ? 'destructive' : analysis.riskScore >= 4 ? 'outline' : 'secondary'}>
                          Risk: {analysis.riskScore.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(Number(analysis.timestamp) / 1_000_000).toLocaleString()}</span>
                        </div>
                        {analysis.alertStatus && (
                          <div className="flex items-center gap-1 text-xs text-destructive">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Alert Generated</span>
                          </div>
                        )}
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
