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
import { AIS_THRESHOLDS } from '../lib/ais';
import {
  AIS_SAMPLE_FILE,
  aisSavePayload,
  aisSourceLabel,
  analyzeFile,
  editRegion,
  editRisk,
  editVesselIDs,
  initialAisForm,
  selectFile,
  setSimulatedReading,
} from '../lib/aisForm';
import sampleCsv from '../data/ais-sample-2026-06-30.csv?raw';

const T = AIS_THRESHOLDS;

export default function AISModule() {
  const [form, setForm] = useState(initialAisForm);
  // Text of the chosen file; kept outside the form so it is never saved.
  const [fileText, setFileText] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [liveStreaming, setLiveStreaming] = useState(false);

  const saveAnalysis = useSaveAISAnalysis();
  const { data: analysisHistory = [], isLoading: historyLoading } = useGetAISAnalysisHistory();

  const riskScore = form.riskScore;
  const analysis = form.analysis;

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const next = selectFile(form, { name: file.name, size: file.size });
    setForm(next);
    setFileText(null);
    if (next.error) {
      toast.error(next.error);
      return;
    }
    // Only read files that passed the size check.
    setFileText(await file.text());
    toast.success('AIS CSV selected. Ready for analysis.');
  };

  const handleUseSample = () => {
    setForm(f => selectFile(f, { ...AIS_SAMPLE_FILE, size: sampleCsv.length }));
    setFileText(sampleCsv);
  };

  const handleCSVAnalysis = () => {
    if (!form.file || fileText === null) {
      toast.error('Please choose a CSV file first');
      return;
    }
    setAnalyzing(true);
    const next = analyzeFile(form, fileText);
    setForm(next);
    setAnalyzing(false);
    if (next.error) toast.error(next.error);
    else toast.success(`Analysed ${aisSourceLabel(next.source)}`);
  };

  const handleLiveStream = async () => {
    setLiveStreaming(true);
    toast.info('Generating simulated AIS stream reading...');

    // Simulated: random score and IDs, no AIS feed is connected
    await new Promise(resolve => setTimeout(resolve, 2000));

    const simulatedRisk = (Math.random() * 10).toFixed(1);
    const simulatedVessels = ['MMSI-' + Math.floor(Math.random() * 1000000), 'IMO-' + Math.floor(Math.random() * 10000000)];
    setForm(f => setSimulatedReading(f, simulatedRisk, simulatedVessels.join(', ')));
    setFileText(null);

    setLiveStreaming(false);
    toast.success('Simulated AIS stream reading generated.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = aisSavePayload(form);
    if (!payload) {
      toast.error('Please provide at least one vessel ID');
      return;
    }

    try {
      await saveAnalysis.mutateAsync(payload);

      if (payload.alertStatus) {
        toast.success('AIS analysis saved. Alert created: vessel behaviour to review.');
      } else {
        toast.success('AIS analysis saved successfully');
      }

      setForm(initialAisForm());
      setFileText(null);
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
            <p className="text-muted-foreground">Vessel behaviour checks on uploaded AIS CSVs, or simulated readings</p>
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
              <CardTitle>AIS Analysis</CardTitle>
              <CardDescription>
                Flags possible loitering, possible AIS gaps and speed anomalies in a MarineCadastre-format CSV. These are
                behaviour to review, not wrongdoing.
              </CardDescription>
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
                    Simulated Stream
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
                    {form.file && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {form.file.name}
                      </p>
                    )}
                    {form.error && <p className="text-xs text-destructive">{form.error}</p>}
                  </div>
                  <Button variant="outline" onClick={handleUseSample} className="w-full">
                    Use sample file (2026-06-30)
                  </Button>
                  <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                    <div className="font-medium">Expected CSV format (up to 20 MB)</div>
                    <div className="text-muted-foreground">
                      MarineCadastre broadcast points, either layout: mmsi, base_date_time, longitude, latitude, sog, ...
                      or MMSI, BaseDateTime, LAT, LON, SOG, ... Day files are about 300 MB compressed for all U.S. waters,
                      so filter them to your area first.
                    </div>
                    <div className="text-muted-foreground">
                      Sample: 8 vessels from MarineCadastre (NOAA/BOEM) data for 2026-06-30, Florida Keys; derived, anonymised
                      (vessel IDs replaced, names and call signs removed). Not an official government dataset.
                    </div>
                  </div>
                  <Button
                    onClick={handleCSVAnalysis}
                    disabled={!form.file || fileText === null || analyzing}
                    className="w-full"
                  >
                    {analyzing ? 'Analyzing...' : 'Analyze AIS Data'}
                  </Button>

                  {analysis && (
                    <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-2">
                      <div className="font-medium text-sm">{aisSourceLabel(form.source)}</div>
                      <div className="grid grid-cols-2 gap-1">
                        <span>Vessels: {analysis.vessels}</span>
                        <span>Positions: {analysis.points}</span>
                        <span>Possible loitering: {analysis.loitering.length}</span>
                        <span>Possible AIS gaps: {analysis.gaps.length}</span>
                        <span>Speed anomalies: {analysis.speedAnomalies.length}</span>
                        <span>Vessels to review: {analysis.flagged.length}</span>
                        <span>Stationary (likely tied up): {analysis.stationary.length}</span>
                      </div>
                      {analysis.flagged.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-border/50">
                          {analysis.flagged.slice(0, 8).map(v => (
                            <div key={v.id} className="flex items-center justify-between gap-2">
                              <span>{v.id}</span>
                              <span className="text-muted-foreground">
                                {[
                                  v.loitering && `possible loitering ×${v.loitering}`,
                                  v.gaps && `possible AIS gap ×${v.gaps}`,
                                  v.speedAnomalies && `speed anomaly ×${v.speedAnomalies}`,
                                ].filter(Boolean).join(', ')}{' '}
                                · score {v.score.toFixed(1)}
                              </span>
                            </div>
                          ))}
                          {analysis.flagged.length > 8 && (
                            <div className="text-muted-foreground">…and {analysis.flagged.length - 8} more</div>
                          )}
                        </div>
                      )}
                      <div className="text-muted-foreground pt-1 border-t border-border/50">
                        Skipped rows: {analysis.issues.badCoordinates} bad coordinates, {analysis.issues.badTimestamps} bad
                        timestamps, {analysis.issues.duplicateTimestamps} duplicate timestamps. "Not available" values read as
                        missing: speed {analysis.issues.unavailable.sog}, course {analysis.issues.unavailable.cog}, heading{' '}
                        {analysis.issues.unavailable.heading}.
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="stream" className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-chart-3" />
                      <span className="font-medium">Simulated AIS Stream</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Generates a random risk score and vessel IDs; no AIS feed is connected
                    </p>
                  </div>

                  <Button
                    onClick={handleLiveStream}
                    disabled={liveStreaming}
                    className="w-full"
                  >
                    {liveStreaming ? 'Generating...' : 'Generate Simulated Stream'}
                  </Button>
                </TabsContent>
              </Tabs>

              <form onSubmit={handleSubmit} className="space-y-4 mt-6 pt-6 border-t">
                <p className="text-xs text-muted-foreground">Changing any field clears the analysis above.</p>
                <div className="space-y-2">
                  <Label htmlFor="region">Region / Area of Interest</Label>
                  <Input
                    id="region"
                    type="text"
                    value={form.region}
                    onChange={(e) => setForm(f => editRegion(f, e.target.value))}
                    placeholder="e.g., Florida Keys, Gulf of Mexico"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vesselIDs">Vessel IDs (MMSI/IMO)</Label>
                  <Input
                    id="vesselIDs"
                    type="text"
                    value={form.vesselIDs}
                    onChange={(e) => setForm(f => editVesselIDs(f, e.target.value))}
                    placeholder="e.g., MMSI-123456, IMO-7890123"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated; filled with the vessels to review after an analysis
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
                    onChange={(e) => setForm(f => editRisk(f, e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {T.scorePerBehaviour} per behaviour type seen on the highest-scoring vessel (possible loitering: under{' '}
                    {T.loiterMaxSpeedKn} kn for {T.loiterMinMinutes}+ min within {T.loiterMaxRadiusKm} km; possible AIS gap: over{' '}
                    {T.gapMinutes} min; speed anomaly: over {T.maxReportedSpeedKn} kn reported or {T.maxImpliedSpeedKn} kn implied), capped at 10
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">Source:</span>
                    <Badge variant="outline">{aisSourceLabel(form.source)}</Badge>
                  </div>
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
                  No AIS analyses yet. Analyse a CSV or the sample file to begin.
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
                          <span>Alert: vessel behaviour to review</span>
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
