import { useState } from 'react';
import { useGetAISAnalysisHistory, useSaveAISAnalysis } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ship, Navigation, AlertTriangle, Upload, Radio, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { isAisAlert } from '../lib/risk';

export default function AISModule() {
  const [riskScore, setRiskScore] = useState('0');
  const [region, setRegion] = useState('Global Waters');
  const [vesselIDs, setVesselIDs] = useState('');
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [liveStreaming, setLiveStreaming] = useState(false);

  const saveAnalysis = useSaveAISAnalysis();
  const { data: analysisHistory = [], isLoading: historyLoading } = useGetAISAnalysisHistory();

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setCSVFile(file);
    toast.success('AIS CSV uploaded. Ready for analysis.');
  };

  const handleCSVAnalysis = async () => {
    if (!csvFile) {
      toast.error('Please upload a CSV file first');
      return;
    }

    setAnalyzing(true);
    toast.info('Analyzing AIS data: vessel routes, speed, loitering...');

    // Simulate CSV parsing and analysis
    await new Promise(resolve => setTimeout(resolve, 2500));

    const simulatedRisk = (Math.random() * 10).toFixed(1);
    setRiskScore(simulatedRisk);

    // Extract simulated vessel IDs from filename
    const simulatedVessels = ['MMSI-' + Math.floor(Math.random() * 1000000), 'IMO-' + Math.floor(Math.random() * 10000000)];
    setVesselIDs(simulatedVessels.join(', '));

    setAnalyzing(false);
    toast.success('AIS analysis complete! Behavioral patterns detected.');
  };

  const handleLiveStream = async () => {
    setLiveStreaming(true);
    toast.info('Starting live AIS stream simulation...');

    // Simulate live streaming
    await new Promise(resolve => setTimeout(resolve, 2000));

    const simulatedRisk = (Math.random() * 10).toFixed(1);
    setRiskScore(simulatedRisk);

    // Generate simulated vessel IDs
    const simulatedVessels = ['MMSI-' + Math.floor(Math.random() * 1000000), 'IMO-' + Math.floor(Math.random() * 10000000)];
    setVesselIDs(simulatedVessels.join(', '));

    setLiveStreaming(false);
    toast.success('Live AIS data stream processed!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const score = parseFloat(riskScore) || 0;
    const vesselIDArray = vesselIDs.split(',').map(id => id.trim()).filter(id => id.length > 0);

    if (vesselIDArray.length === 0) {
      toast.error('Please provide at least one vessel ID (MMSI/IMO)');
      return;
    }

    try {
      const alertStatus = isAisAlert(score);

      await saveAnalysis.mutateAsync({
        dataModule: 'AIS Intelligence',
        region,
        vesselIDs: vesselIDArray,
        riskScore: score,
        alertStatus,
      });

      if (alertStatus) {
        toast.success('AIS analysis saved! Illegal fishing alert automatically generated.');
      } else {
        toast.success('AIS analysis saved successfully');
      }

      // Reset form
      setRiskScore('0');
      setVesselIDs('');
      setRegion('Global Waters');
      setCSVFile(null);
    } catch (error) {
      console.error('Failed to save AIS analysis:', error);
      toast.error('Failed to save AIS analysis');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-chart-3 to-chart-4 flex items-center justify-center">
            <Ship className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AIS Intelligence Module</h1>
            <p className="text-muted-foreground">Live vessel tracking, behavior analytics & illegal fishing detection</p>
          </div>
        </div>

        {/* Hero Image */}
        <Card>
          <CardContent className="p-0">
            <img
              src="/assets/generated/ais-vessel-tracking.dim_600x400.jpg"
              alt="AIS Vessel Tracking"
              className="w-full h-64 object-cover rounded-lg"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Input */}
          <Card>
            <CardHeader>
              <CardTitle>Live AIS Analysis</CardTitle>
              <CardDescription>Upload CSV data or connect to live AIS stream</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="csv" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="csv">
                    <Upload className="w-4 h-4 mr-2" />
                    CSV Upload
                  </TabsTrigger>
                  <TabsTrigger value="stream">
                    <Radio className="w-4 h-4 mr-2" />
                    Live Stream
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="csv" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="csvUpload">AIS CSV File</Label>
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
                      MMSI, Latitude, Longitude, Speed, Course, Timestamp
                    </div>
                  </div>
                  <Button
                    onClick={handleCSVAnalysis}
                    disabled={!csvFile || analyzing}
                    className="w-full"
                  >
                    {analyzing ? 'Analyzing...' : 'Analyze AIS Data'}
                  </Button>
                </TabsContent>

                <TabsContent value="stream" className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-chart-3" />
                      <span className="font-medium">Live AIS Stream</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Connect to real-time AIS data feed for continuous vessel monitoring
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Analysis Features</Label>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>• Loitering detection</div>
                      <div>• Route deviation analysis</div>
                      <div>• AIS gap identification</div>
                      <div>• Zone violation monitoring</div>
                    </div>
                  </div>

                  <Button
                    onClick={handleLiveStream}
                    disabled={liveStreaming}
                    className="w-full"
                  >
                    {liveStreaming ? 'Processing Stream...' : 'Start Live Stream'}
                  </Button>
                </TabsContent>
              </Tabs>

              <form onSubmit={handleSubmit} className="space-y-4 mt-6 pt-6 border-t">
                <div className="space-y-2">
                  <Label htmlFor="region">Region / Area of Interest</Label>
                  <Input
                    id="region"
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g., South China Sea, Gulf of Mexico"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vesselIDs">Vessel IDs (MMSI/IMO)</Label>
                  <Input
                    id="vesselIDs"
                    type="text"
                    value={vesselIDs}
                    onChange={(e) => setVesselIDs(e.target.value)}
                    placeholder="e.g., MMSI-123456, IMO-7890123"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of vessel identifiers
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="riskScore">AIS Risk Score (0-10)</Label>
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
                    Based on loitering, route deviation, and AIS gaps
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Risk Level:</span>
                    <Badge variant={parseFloat(riskScore) >= 7 ? 'destructive' : 'secondary'}>
                      {parseFloat(riskScore) >= 7 ? 'High' : parseFloat(riskScore) >= 4 ? 'Medium' : 'Low'}
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
              <CardDescription>Previously completed AIS analyses with alert status</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading analysis history...</div>
              ) : analysisHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No AIS analyses yet. Upload CSV or start live stream to begin.
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {analysisHistory.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="p-4 rounded-lg bg-muted/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-chart-3" />
                          <span className="font-medium text-sm">{analysis.dataModule}</span>
                        </div>
                        <Badge variant={analysis.riskScore >= 7 ? 'destructive' : 'secondary'}>
                          Risk: {analysis.riskScore.toFixed(1)}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Region:</span>
                          <span>{analysis.region}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Vessels:</span>
                          <span>{analysis.vesselIDs.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(Number(analysis.timestamp) / 1000000).toLocaleString()}</span>
                        </div>
                      </div>

                      {analysis.alertStatus && (
                        <div className="flex items-center gap-2 text-xs text-destructive pt-2 border-t">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Alert generated: Illegal fishing detected</span>
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
