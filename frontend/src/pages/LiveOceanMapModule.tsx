import { useGetMapData } from '../hooks/useQueries';
import type { VesselData, OceanParameter } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Waves, Thermometer, Droplets, Wind, Navigation } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { vesselRiskBand, type VesselRiskBand } from '../lib/risk';

const VESSEL_BAND_COLORS: Record<VesselRiskBand, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Moderate: '#eab308',
  Low: '#22c55e',
};

const VESSEL_BAND_BADGE: Record<VesselRiskBand, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Critical: 'destructive',
  High: 'default',
  Moderate: 'secondary',
  Low: 'outline',
};

export default function LiveOceanMapModule() {
  const { data: mapData, isLoading } = useGetMapData();
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [showTemp, setShowTemp] = useState(false);
  const [showPollution, setShowPollution] = useState(false);
  const [showCurrents, setShowCurrents] = useState(false);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const overlayLayersRef = useRef<{
    temp: any[];
    pollution: any[];
    currents: any[];
  }>({ temp: [], pollution: [], currents: [] });

  const vessels = mapData?.vessels || [];
  const tempOverlays = mapData?.tempOverlays || [];
  const pollutionOverlays = mapData?.pollutionOverlays || [];
  const currOverlays = mapData?.currOverlays || [];

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => {
        setLeafletLoaded(true);
      };
      document.head.appendChild(script);
    } else if (window.L) {
      setLeafletLoaded(true);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapRef.current) return;

    const L = window.L;
    
    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 10,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Update vessel markers
  useEffect(() => {
    if (!mapRef.current || !leafletLoaded || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    // Remove markers for vessels that no longer exist
    const currentVesselIds = new Set(vessels.map(v => v.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentVesselIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Update or create markers for current vessels
    vessels.forEach((vessel: VesselData) => {
      const existingMarker = markersRef.current.get(vessel.id);
      
      // Determine color based on risk score
      const color = VESSEL_BAND_COLORS[vesselRiskBand(vessel.riskScore)];

      if (existingMarker) {
        // Update existing marker position smoothly
        existingMarker.setLatLng([vessel.coordinates.lat, vessel.coordinates.lng]);
      } else {
        // Create new marker
        const icon = L.divIcon({
          className: 'vessel-marker',
          html: `<div style="
            width: 14px;
            height: 14px;
            background-color: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([vessel.coordinates.lat, vessel.coordinates.lng], { icon })
          .bindPopup(`
            <div style="font-family: system-ui; min-width: 220px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">${vessel.name}</h3>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                <strong>Type:</strong> ${vessel.type}
              </div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                <strong>MMSI:</strong> ${vessel.mmsi}
              </div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                <strong>Location:</strong> ${vessel.coordinates.lat.toFixed(4)}°, ${vessel.coordinates.lng.toFixed(4)}°
              </div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                <strong>Speed:</strong> ${vessel.speed.toFixed(1)} knots
              </div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                <strong>Heading:</strong> ${vessel.heading.toFixed(0)}°
              </div>
              <div style="font-size: 12px; margin-top: 6px;">
                <strong>Risk Level:</strong> <span style="color: ${color}; font-weight: 600;">${vessel.riskLevel}</span>
              </div>
              <div style="font-size: 12px; color: #666;">
                <strong>Risk Score:</strong> ${vessel.riskScore.toFixed(2)}
              </div>
            </div>
          `)
          .addTo(map);

        markersRef.current.set(vessel.id, marker);
      }
    });
  }, [vessels, leafletLoaded]);

  // Update temperature overlay
  useEffect(() => {
    if (!mapRef.current || !leafletLoaded || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    // Clear existing temperature overlays
    overlayLayersRef.current.temp.forEach(layer => layer.remove());
    overlayLayersRef.current.temp = [];

    if (showTemp && tempOverlays.length > 0) {
      tempOverlays.forEach((param: OceanParameter) => {
        // Determine color based on temperature
        let color: string;
        let opacity = 0.4;
        if (param.temp >= 25) {
          color = '#ef4444'; // Hot - Red
        } else if (param.temp >= 20) {
          color = '#f97316'; // Warm - Orange
        } else if (param.temp >= 15) {
          color = '#eab308'; // Moderate - Yellow
        } else {
          color = '#3b82f6'; // Cool - Blue
        }

        const circle = L.circle([param.location.lat, param.location.lng], {
          color: color,
          fillColor: color,
          fillOpacity: opacity,
          radius: 300000, // 300km radius
          weight: 1,
        })
          .bindTooltip(`
            <div style="font-family: system-ui;">
              <strong>Temperature</strong><br/>
              ${param.temp.toFixed(1)}°C
            </div>
          `, { permanent: false, direction: 'top' })
          .addTo(map);

        overlayLayersRef.current.temp.push(circle);
      });
    }
  }, [showTemp, tempOverlays, leafletLoaded]);

  // Update pollution overlay
  useEffect(() => {
    if (!mapRef.current || !leafletLoaded || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    // Clear existing pollution overlays
    overlayLayersRef.current.pollution.forEach(layer => layer.remove());
    overlayLayersRef.current.pollution = [];

    if (showPollution && pollutionOverlays.length > 0) {
      pollutionOverlays.forEach((param: OceanParameter) => {
        // Determine color based on pollution level
        let color: string;
        let opacity = 0.5;
        if (param.pollution >= 0.7) {
          color = '#7c2d12'; // Critical - Dark Red
          opacity = 0.6;
        } else if (param.pollution >= 0.5) {
          color = '#dc2626'; // High - Red
        } else if (param.pollution >= 0.3) {
          color = '#f59e0b'; // Moderate - Amber
        } else {
          color = '#84cc16'; // Low - Lime
          opacity = 0.3;
        }

        const circle = L.circle([param.location.lat, param.location.lng], {
          color: color,
          fillColor: color,
          fillOpacity: opacity,
          radius: 250000, // 250km radius
          weight: 2,
        })
          .bindTooltip(`
            <div style="font-family: system-ui;">
              <strong>Pollution Index</strong><br/>
              ${param.pollution.toFixed(2)} (${param.pollution >= 0.7 ? 'Critical' : param.pollution >= 0.5 ? 'High' : param.pollution >= 0.3 ? 'Moderate' : 'Low'})
            </div>
          `, { permanent: false, direction: 'top' })
          .addTo(map);

        overlayLayersRef.current.pollution.push(circle);
      });
    }
  }, [showPollution, pollutionOverlays, leafletLoaded]);

  // Update currents overlay
  useEffect(() => {
    if (!mapRef.current || !leafletLoaded || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    // Clear existing current overlays
    overlayLayersRef.current.currents.forEach(layer => layer.remove());
    overlayLayersRef.current.currents = [];

    if (showCurrents && currOverlays.length > 0) {
      currOverlays.forEach((param: OceanParameter) => {
        const speed = param.curr.speed;
        const direction = param.curr.direction;

        // Calculate arrow endpoint based on direction and speed
        const arrowLength = speed * 0.5; // Scale factor for visualization
        const radians = (direction * Math.PI) / 180;
        const endLat = param.location.lat + (arrowLength * Math.cos(radians));
        const endLng = param.location.lng + (arrowLength * Math.sin(radians));

        // Determine color based on current speed
        let color: string;
        if (speed >= 4) {
          color = '#dc2626'; // Fast - Red
        } else if (speed >= 3) {
          color = '#f97316'; // Moderate-Fast - Orange
        } else if (speed >= 2) {
          color = '#3b82f6'; // Moderate - Blue
        } else {
          color = '#06b6d4'; // Slow - Cyan
        }

        // Draw arrow line
        const arrow = L.polyline(
          [
            [param.location.lat, param.location.lng],
            [endLat, endLng],
          ],
          {
            color: color,
            weight: 3,
            opacity: 0.7,
          }
        )
          .bindTooltip(`
            <div style="font-family: system-ui;">
              <strong>Ocean Current</strong><br/>
              Speed: ${speed.toFixed(1)} m/s<br/>
              Direction: ${direction.toFixed(0)}°
            </div>
          `, { permanent: false, direction: 'top' })
          .addTo(map);

        overlayLayersRef.current.currents.push(arrow);

        // Add arrowhead
        const arrowHead = L.circle([endLat, endLng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.8,
          radius: 50000, // 50km radius for arrowhead
          weight: 2,
        }).addTo(map);

        overlayLayersRef.current.currents.push(arrowHead);
      });
    }
  }, [showCurrents, currOverlays, leafletLoaded]);

  const getRiskLabel = (score: number): string => vesselRiskBand(score);

  const getRiskColor = (score: number): 'default' | 'secondary' | 'destructive' | 'outline' =>
    VESSEL_BAND_BADGE[vesselRiskBand(score)];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-chart-1 to-chart-3 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Live Ocean Map</h1>
              <p className="text-muted-foreground">Real-time vessel tracking and ocean parameter monitoring</p>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <Card>
          <CardContent className="p-0">
            <img
              src="/assets/generated/global-ocean-risk-map.dim_1000x600.jpg"
              alt="Global Ocean Risk Map"
              className="w-full h-64 object-cover rounded-lg"
            />
          </CardContent>
        </Card>

        {/* Map Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Map Overlays</CardTitle>
            <CardDescription>Toggle ocean parameter visualizations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={showTemp ? 'default' : 'outline'}
                onClick={() => setShowTemp(!showTemp)}
                className="flex items-center gap-2"
              >
                <Thermometer className="w-4 h-4" />
                Temperature
              </Button>
              <Button
                variant={showPollution ? 'default' : 'outline'}
                onClick={() => setShowPollution(!showPollution)}
                className="flex items-center gap-2"
              >
                <Droplets className="w-4 h-4" />
                Pollution
              </Button>
              <Button
                variant={showCurrents ? 'default' : 'outline'}
                onClick={() => setShowCurrents(!showCurrents)}
                className="flex items-center gap-2"
              >
                <Wind className="w-4 h-4" />
                Currents
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Live Vessel Tracking
            </CardTitle>
            <CardDescription>Sample vessel data (fixed demo vessels from the backend) with risk assessment • Refreshes every 45 seconds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-border">
              <div 
                ref={mapContainerRef} 
                className="absolute inset-0 z-0"
                style={{ background: '#1a1a2e' }}
              />
              
              {/* Loading Overlay */}
              {(isLoading || !leafletLoaded) && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-20">
                  <div className="flex flex-col items-center gap-3">
                    <Waves className="w-12 h-12 text-chart-1 animate-pulse" />
                    <span className="text-sm text-muted-foreground font-medium">
                      Loading map data...
                    </span>
                  </div>
                </div>
              )}

              {/* Vessel Count Overlay */}
              {!isLoading && vessels.length > 0 && (
                <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 border border-border z-10">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Active Vessels</div>
                  <div className="text-2xl font-bold text-chart-1">{vessels.length}</div>
                </div>
              )}

              {/* Overlay Status Indicators */}
              {!isLoading && (showTemp || showPollution || showCurrents) && (
                <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 border border-border z-10 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Active Overlays</div>
                  {showTemp && (
                    <div className="flex items-center gap-2 text-xs">
                      <Thermometer className="w-3 h-3 text-chart-1" />
                      <span>Temperature</span>
                    </div>
                  )}
                  {showPollution && (
                    <div className="flex items-center gap-2 text-xs">
                      <Droplets className="w-3 h-3 text-chart-2" />
                      <span>Pollution</span>
                    </div>
                  )}
                  {showCurrents && (
                    <div className="flex items-center gap-2 text-xs">
                      <Wind className="w-3 h-3 text-chart-3" />
                      <span>Currents</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vessel List */}
        {vessels.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tracked Vessels</CardTitle>
              <CardDescription>Sample vessel data with risk assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vessels.map((vessel: VesselData) => (
                  <div
                    key={vessel.id}
                    className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-chart-1" />
                        <div>
                          <div className="font-semibold">{vessel.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {vessel.type} • MMSI: {vessel.mmsi}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {vessel.coordinates.lat.toFixed(4)}°, {vessel.coordinates.lng.toFixed(4)}°
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Speed: {vessel.speed.toFixed(1)} knots • Heading: {vessel.heading.toFixed(0)}°
                          </div>
                        </div>
                      </div>
                      <Badge variant={getRiskColor(vessel.riskScore)}>
                        {vessel.riskLevel}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {vessels.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Waves className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No vessels currently tracked. System monitoring continues.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
