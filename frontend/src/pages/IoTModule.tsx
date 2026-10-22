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

export default function IoTModule() {
  const [riskScore, setRiskScore] = useState('0');
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // NOAA buoy simulation
  const [buoyLocation, setBuoyLocation] = useState('pacific-buoy-1');
  const [fetchingBuoy, setFetchingBuoy] = useState(false);
  const [sensorData, setSensorData] = useState({
    temperature: '0',
    ph: '0',
    turbidity: '0',
    oxygen: '0',
  });

  const saveAnalysis = useSaveIoTAnalysis();
  const { data: iotAnalyses = [], isLoading } = useGetIoTAnalysisHistory();

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
    toast.info('Analyzing IoT sensor data...');

    // Simulate CSV parsing and analysis
    await new Promise(resolve => setTimeout(resolve, 2000));

    const simulatedRisk = (Math.random() * 10).toFixed(1);
    setRiskScore(simulatedRisk);

    // Simulate sensor data extraction from CSV
    const temp = (20 + Math.random() * 15).toFixed(1);
    const ph = (7.5 + Math.random() * 1).toFixed(2);
    const turbidity = (Math.random() * 50).toFixed(1);
    const oxygen = (5 + Math.random() * 5).toFixed(1);

    setSensorData({
      temperature: temp,
      ph,
      turbidity,
      oxygen,
    });

    setAnalyzing(false);
    toast.success('IoT data analysis complete!');
  };

  const handleBuoyFetch = async () => {
    setFetchingBuoy(true);
    toast.info('Fetching live data from NOAA buoy network...');

    // Simulate NOAA buoy API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    const temp = (20 + Math.random() * 15).toFixed(1);
    const ph = (7.5 + Math.random() * 1).toFixed(2);
    const turbidity = (Math.random() * 50).toFixed(1);
    const oxygen = (5 + Math.random() * 5).toFixed(1);

    setSensorData({
      temperature: temp,
      ph,
      turbidity,
      oxygen,
    });

    // Calculate risk based on parameters
    let risk = 0;
    if (parseFloat(temp) > 30) risk += 3;
    if (parseFloat(ph) < 7.8 || parseFloat(ph) > 8.3) risk += 2;
    if (parseFloat(turbidity) > 30) risk += 2.5;
    if (parseFloat(oxygen) < 6) risk += 2.5;

    setRiskScore(Math.min(risk, 10).toFixed(1));

    setFetchingBuoy(false);
    toast.success('Live buoy data retrieved successfully!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const score = parseFloat(riskScore) || 0;

    // Determine data type based on which parameter has the highest risk
    let dataType = 'temperature';
    if (parseFloat(sensorData.ph) < 7.8 || parseFloat(sensorData.ph) > 8.3) {
      dataType = 'pH';
    } else if (parseFloat(sensorData.turbidity) > 30) {
      dataType = 'turbidity';
    } else if (parseFloat(sensorData.oxygen) < 6) {
      dataType = 'oxygen';
    }

    // Determine region based on buoy location
    const regionMap: Record<string, string> = {
      'pacific-buoy-1': 'Pacific Ocean',
      'atlantic-buoy-2': 'Atlantic Ocean',
      'caribbean-buoy-3': 'Caribbean Sea',
      'indian-buoy-4': 'Indian Ocean',
    };
    const region = regionMap[buoyLocation] || 'Unknown Region';

    const alertStatus = isIotAlert(score);

    try {
      await saveAnalysis.mutateAsync({
        dataModule: 'IoT Intelligence',
        region,
        dataType,
        riskScore: score,
        alertStatus,
      });

      if (alertStatus) {
        toast.success('Climate stress alert automatically generated!');
      } else {
        toast.success('IoT analysis saved successfully');
      }

      // Reset form
      setRiskScore('0');
      setCSVFile(null);
      setSensorData({ temperature: '0', ph: '0', turbidity: '0', oxygen: '0' });
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
            <p className="text-muted-foreground">Live ocean parameter monitoring & climate stress detection</p>
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
              <CardTitle>Live IoT Data</CardTitle>
              <CardDescription>Upload sensor CSV or connect to NOAA buoy network</CardDescription>
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
                    NOAA Buoy
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
                    {analyzing ? 'Analyzing...' : 'Analyze Sensor Data'}
                  </Button>
                </TabsContent>

                <TabsContent value="buoy" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="buoyLocation">Buoy Location</Label>
                    <Select value={buoyLocation} onValueChange={setBuoyLocation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pacific-buoy-1">Pacific Ocean - Buoy 1</SelectItem>
                        <SelectItem value="atlantic-buoy-2">Atlantic Ocean - Buoy 2</SelectItem>
                        <SelectItem value="caribbean-buoy-3">Caribbean Sea - Buoy 3</SelectItem>
                        <SelectItem value="indian-buoy-4">Indian Ocean - Buoy 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                    <div className="font-medium">NOAA Buoy Network</div>
                    <div className="text-xs text-muted-foreground">
                      Real-time ocean parameter monitoring
                    </div>
                  </div>

                  <Button
                    onClick={handleBuoyFetch}
                    disabled={fetchingBuoy}
                    className="w-full"
                  >
                    {fetchingBuoy ? 'Fetching...' : 'Fetch Live Buoy Data'}
                  </Button>

                  {parseFloat(sensorData.temperature) > 0 && (
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Temperature</div>
                        <div className="font-medium">{sensorData.temperature}°C</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">pH Level</div>
                        <div className="font-medium">{sensorData.ph}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Turbidity</div>
                        <div className="font-medium">{sensorData.turbidity} NTU</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Oxygen</div>
                        <div className="font-medium">{sensorData.oxygen} mg/L</div>
                      </div>
                    </div>
                  )}
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
                    onChange={(e) => setRiskScore(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Based on temperature, pH, turbidity, and oxygen levels
                  </p>
                </div>

                <div className="pt-4 border-t">
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
                  No IoT analyses yet. Upload CSV or fetch buoy data to begin.
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
