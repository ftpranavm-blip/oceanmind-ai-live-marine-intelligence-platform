// AIS vessel-behaviour rules for uploaded CSVs in the MarineCadastre broadcast
// point layout (https://hub.marinecadastre.gov/pages/vesseltraffic).
//
// The rules flag behaviour for a person to review: "possible loitering",
// "possible AIS gap" and "speed anomaly". They do not show wrongdoing.
// Pure functions only (no runtime imports).

export const AIS_THRESHOLDS = {
  /** Possible loitering: reported speed below this (knots)... */
  loiterMaxSpeedKn: 1,
  /** ...for at least this long (minutes)... */
  loiterMinMinutes: 60,
  /** ...while staying within this distance (km) of where the stretch started. */
  loiterMaxRadiusKm: 1,
  /** Possible AIS gap: no report from a vessel for more than this (minutes). */
  gapMinutes: 30,
  /** Speed anomaly: reported speed above this (knots), except high-speed craft (types 40-49). */
  maxReportedSpeedKn: 40,
  /** Speed anomaly: speed implied by two consecutive positions above this (knots)... */
  maxImpliedSpeedKn: 50,
  /** ...when the positions are more than this far apart (km), so GPS jitter is ignored. */
  minJumpKm: 1,
  /**
   * Stationary (likely tied up), not loitering: 90% of a vessel's positions lie
   * within this distance (m) of its median position...
   */
  stationaryRadiusM: 250,
  /** ...and it was seen for at least this long (hours), i.e. most of a one-day file. */
  stationaryMinHours: 12,
  /** Risk: points per distinct behaviour type a vessel shows (capped at 10). */
  scorePerBehaviour: 3.5,
} as const;

// AIS navigational status codes (ITU-R M.1371, used by the NAIS data that
// MarineCadastre publishes). Moored and at-anchor points are excluded from
// loitering: both are declared stationary states, so being still is expected.
export const AIS_STATUS = { AT_ANCHOR: 1, MOORED: 5, NOT_DEFINED: 15 } as const;

// MarineCadastre "not available" values (AIS FAQ): SOG 102.3, COG 360.0,
// heading 511. They are read as missing, never as measurements.
const SOG_UNAVAILABLE = 102.3;
const COG_UNAVAILABLE = 360;
const HEADING_UNAVAILABLE = 511;

export const MAX_AIS_UPLOAD_BYTES = 20 * 1024 * 1024;

export function checkUploadSize(bytes: number): string | null {
  if (bytes <= MAX_AIS_UPLOAD_BYTES) return null;
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `This file is ${mb} MB; the limit is 20 MB. Filter the AIS day file to your area or a few vessels first.`;
}

export interface AisPoint {
  id: string;
  /** Milliseconds since the epoch, UTC. */
  time: number;
  lat: number;
  lon: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  status: number | null;
  vesselType: number | null;
}

export interface AisParseIssues {
  rows: number;
  badCoordinates: number;
  badTimestamps: number;
  missingId: number;
  unavailable: { sog: number; cog: number; heading: number };
}

export interface AisParseResult {
  layout: 'snake_case' | 'CamelCase';
  points: AisPoint[];
  issues: AisParseIssues;
}

// Column names in the 2025+ data dictionary and in the 2018-2024 one.
const LAYOUTS = {
  snake_case: { id: 'mmsi', time: 'base_date_time', lat: 'latitude', lon: 'longitude', sog: 'sog', cog: 'cog', heading: 'heading', status: 'status', vesselType: 'vessel_type' },
  CamelCase: { id: 'MMSI', time: 'BaseDateTime', lat: 'LAT', lon: 'LON', sog: 'SOG', cog: 'COG', heading: 'Heading', status: 'Status', vesselType: 'VesselType' },
} as const;
const REQUIRED = ['id', 'time', 'lat', 'lon'] as const;

const num = (s: string | undefined) => {
  if (s === undefined || s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export function parseAisCsv(text: string): AisParseResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const header = (lines[0] ?? '').split(',').map(h => h.trim());
  const layout = header.includes('mmsi') ? 'snake_case' : header.includes('MMSI') ? 'CamelCase' : null;
  const names = LAYOUTS[layout ?? 'snake_case'];
  const missing = REQUIRED.filter(k => !header.includes(names[k]));
  if (!layout || missing.length) {
    throw new Error(`Not a MarineCadastre AIS CSV: missing columns: ${(layout ? missing : REQUIRED).map(k => names[k]).join(', ')}`);
  }
  const col = Object.fromEntries(Object.entries(names).map(([k, name]) => [k, header.indexOf(name)])) as Record<keyof typeof names, number>;
  const issues: AisParseIssues = { rows: 0, badCoordinates: 0, badTimestamps: 0, missingId: 0, unavailable: { sog: 0, cog: 0, heading: 0 } };
  const points: AisPoint[] = [];

  for (const line of lines.slice(1)) {
    issues.rows++;
    const f = line.split(',');
    const id = (f[col.id] ?? '').trim();
    if (!id) { issues.missingId++; continue; }

    const time = Date.parse(`${(f[col.time] ?? '').trim().replace(' ', 'T')}Z`);
    if (Number.isNaN(time)) { issues.badTimestamps++; continue; }

    const lat = num(f[col.lat]);
    const lon = num(f[col.lon]);
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) {
      issues.badCoordinates++;
      continue;
    }

    let sog = col.sog >= 0 ? num(f[col.sog]) : null;
    if (sog !== null && (sog === SOG_UNAVAILABLE || sog < 0 || sog > SOG_UNAVAILABLE)) { issues.unavailable.sog++; sog = null; }
    let cog = col.cog >= 0 ? num(f[col.cog]) : null;
    if (cog !== null && (cog === COG_UNAVAILABLE || cog < 0 || cog > COG_UNAVAILABLE)) { issues.unavailable.cog++; cog = null; }
    let heading = col.heading >= 0 ? num(f[col.heading]) : null;
    if (heading !== null && (heading === HEADING_UNAVAILABLE || heading < 0 || heading > 359)) { issues.unavailable.heading++; heading = null; }
    let status = col.status >= 0 ? num(f[col.status]) : null;
    if (status === AIS_STATUS.NOT_DEFINED) status = null;
    const vesselType = col.vesselType >= 0 ? num(f[col.vesselType]) : null;

    points.push({ id, time, lat, lon, sog, cog, heading, status, vesselType });
  }
  return { layout, points, issues };
}

export interface AisTrack {
  id: string;
  /** Sorted by time, one point per timestamp. */
  points: AisPoint[];
}

// Groups points by vessel, sorts each vessel's points by time and keeps the
// first point of any duplicate timestamp.
export function buildTracks(points: AisPoint[]): { tracks: AisTrack[]; duplicateTimestamps: number } {
  const byId = new Map<string, AisPoint[]>();
  for (const p of points) {
    const list = byId.get(p.id);
    if (list) list.push(p);
    else byId.set(p.id, [p]);
  }
  let duplicateTimestamps = 0;
  const tracks: AisTrack[] = [];
  for (const [id, list] of byId) {
    list.sort((a, b) => a.time - b.time);
    const unique = list.filter((p, i) => {
      if (i > 0 && p.time === list[i - 1].time) { duplicateTimestamps++; return false; }
      return true;
    });
    tracks.push({ id, points: unique });
  }
  tracks.sort((a, b) => a.id.localeCompare(b.id));
  return { tracks, duplicateTimestamps };
}

const MIN = 60_000;

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export interface AisGap { id: string; start: number; end: number; minutes: number }

// Silences between two reports of the same vessel. Time before its first
// report or after its last is not a gap: the file simply starts or ends there.
export function findGaps(track: AisTrack): AisGap[] {
  const gaps: AisGap[] = [];
  for (let i = 1; i < track.points.length; i++) {
    const minutes = Math.round((track.points[i].time - track.points[i - 1].time) / MIN);
    if (minutes > AIS_THRESHOLDS.gapMinutes) {
      gaps.push({ id: track.id, start: track.points[i - 1].time, end: track.points[i].time, minutes });
    }
  }
  return gaps;
}

// Stationary vessel: seen for at least stationaryMinHours, with 90% of its
// positions within stationaryRadiusM of its median position. The 90th
// percentile (not the maximum) is used because tied-up boats show occasional
// GPS spikes of 100+ m.
//
// Taken from one day in one area (MarineCadastre, 2026-06-30, Florida Keys):
// the 91 vessels the loitering rule flagged split into 62 with a 90th-percentile
// radius of at most 93 m and 29 with at least 712 m, with none between; 250 m
// sits inside that empty band. The radius leaves room either side; 6 to 12
// hours gave the same result there. These values may not generalise to other
// areas, days or vessel mixes.
export function isStationary(track: AisTrack): boolean {
  const pts = track.points;
  if (pts.length < 2) return false;
  if ((pts[pts.length - 1].time - pts[0].time) / 3_600_000 < AIS_THRESHOLDS.stationaryMinHours) return false;
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const centre = { lat: median(pts.map(p => p.lat)), lon: median(pts.map(p => p.lon)) };
  const metres = pts.map(p => distanceKm(centre, p) * 1000).sort((a, b) => a - b);
  return metres[Math.min(metres.length - 1, Math.floor(0.9 * metres.length))] <= AIS_THRESHOLDS.stationaryRadiusM;
}

export interface AisLoitering { id: string; start: number; end: number; minutes: number; lat: number; lon: number }

const isSlow = (p: AisPoint) =>
  p.sog !== null && p.sog < AIS_THRESHOLDS.loiterMaxSpeedKn && p.status !== AIS_STATUS.MOORED && p.status !== AIS_STATUS.AT_ANCHOR;

// Stretches of consecutive slow points (not moored, not at anchor) that stay
// within loiterMaxRadiusKm of the first point and last at least loiterMinMinutes.
// A missing speed, a gap or leaving the radius ends a stretch. Stationary
// vessels (see isStationary) are not loitering.
export function findLoitering(track: AisTrack): AisLoitering[] {
  if (isStationary(track)) return [];
  const events: AisLoitering[] = [];
  const pts = track.points;
  let start = -1;
  const close = (endIdx: number) => {
    if (start < 0) return;
    const minutes = Math.round((pts[endIdx].time - pts[start].time) / MIN);
    if (minutes >= AIS_THRESHOLDS.loiterMinMinutes) {
      events.push({ id: track.id, start: pts[start].time, end: pts[endIdx].time, minutes, lat: pts[start].lat, lon: pts[start].lon });
    }
    start = -1;
  };
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (start >= 0) {
      const gap = (p.time - pts[i - 1].time) / MIN > AIS_THRESHOLDS.gapMinutes;
      const left = distanceKm(pts[start], p) > AIS_THRESHOLDS.loiterMaxRadiusKm;
      if (!isSlow(p) || gap || left) close(i - 1);
    }
    if (start < 0 && isSlow(p)) start = i;
  }
  if (pts.length) close(pts.length - 1);
  return events;
}

export interface AisSpeedAnomaly { id: string; time: number; kind: 'reported' | 'implied'; knots: number }

const isHighSpeedCraft = (p: AisPoint) => p.vesselType !== null && p.vesselType >= 40 && p.vesselType <= 49;

export function findSpeedAnomalies(track: AisTrack): AisSpeedAnomaly[] {
  const events: AisSpeedAnomaly[] = [];
  const pts = track.points;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.sog !== null && p.sog > AIS_THRESHOLDS.maxReportedSpeedKn && !isHighSpeedCraft(p)) {
      events.push({ id: track.id, time: p.time, kind: 'reported', knots: p.sog });
    }
    if (i > 0) {
      const hours = (p.time - pts[i - 1].time) / 3_600_000;
      const km = distanceKm(pts[i - 1], p);
      const knots = km / 1.852 / hours;
      if (hours > 0 && km > AIS_THRESHOLDS.minJumpKm && knots > AIS_THRESHOLDS.maxImpliedSpeedKn) {
        events.push({ id: track.id, time: p.time, kind: 'implied', knots: Math.round(knots * 10) / 10 });
      }
    }
  }
  return events;
}

export interface AisBehaviourCounts { loitering: number; gaps: number; speedAnomalies: number }

// 0-10: scorePerBehaviour for each distinct behaviour type, capped at 10.
// One behaviour type gives 3.5; two give 7.0 (the AIS alert threshold); three give 10.
export function aisRiskScore(c: AisBehaviourCounts): number {
  const types = [c.loitering, c.gaps, c.speedAnomalies].filter(n => n > 0).length;
  return Math.min(types * AIS_THRESHOLDS.scorePerBehaviour, 10);
}

export interface AisVesselResult extends AisBehaviourCounts {
  id: string;
  points: number;
  score: number;
}

export interface AisAnalysis {
  layout: AisParseResult['layout'];
  issues: AisParseIssues & { duplicateTimestamps: number };
  vessels: number;
  points: number;
  dates: { first: string; last: string } | null;
  loitering: AisLoitering[];
  gaps: AisGap[];
  speedAnomalies: AisSpeedAnomaly[];
  /** Vessels with at least one behaviour, highest score first. */
  flagged: AisVesselResult[];
  /** Vessels treated as stationary (likely tied up); not a risk behaviour. */
  stationary: string[];
  /** Highest vessel score in the file. */
  riskScore: number;
}

export function analyzeAis(text: string): AisAnalysis {
  const parsed = parseAisCsv(text);
  const { tracks, duplicateTimestamps } = buildTracks(parsed.points);
  const loitering: AisLoitering[] = [];
  const gaps: AisGap[] = [];
  const speedAnomalies: AisSpeedAnomaly[] = [];
  const results: AisVesselResult[] = [];
  for (const t of tracks) {
    const l = findLoitering(t);
    const g = findGaps(t);
    const s = findSpeedAnomalies(t);
    loitering.push(...l);
    gaps.push(...g);
    speedAnomalies.push(...s);
    const counts = { loitering: l.length, gaps: g.length, speedAnomalies: s.length };
    results.push({ id: t.id, points: t.points.length, ...counts, score: aisRiskScore(counts) });
  }
  const times = parsed.points.map(p => p.time);
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const flagged = results.filter(r => r.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return {
    layout: parsed.layout,
    issues: { ...parsed.issues, duplicateTimestamps },
    vessels: tracks.length,
    points: tracks.reduce((n, t) => n + t.points.length, 0),
    dates: times.length ? { first: day(Math.min(...times)), last: day(Math.max(...times)) } : null,
    loitering,
    gaps,
    speedAnomalies,
    flagged,
    stationary: tracks.filter(isStationary).map(t => t.id),
    riskScore: flagged.length ? flagged[0].score : 0,
  };
}
