// AIS parsing and behaviour rules. Edge cases use small synthetic CSVs written
// in this file; the real-data checks use the committed anonymised sample.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AIS_STATUS,
  AIS_THRESHOLDS,
  MAX_AIS_UPLOAD_BYTES,
  aisRiskScore,
  analyzeAis,
  buildTracks,
  checkUploadSize,
  findGaps,
  findLoitering,
  findSpeedAnomalies,
  isStationary,
  parseAisCsv,
} from './ais';
import { isAisAlert } from './risk';

const SNAKE = 'mmsi,base_date_time,longitude,latitude,sog,cog,heading,vessel_name,imo,call_sign,vessel_type,status,length,width,draft,cargo,transceiver';
const CAMEL = 'MMSI,BaseDateTime,LAT,LON,SOG,COG,Heading,VesselName,IMO,CallSign,VesselType,Status,Length,Width,Draft,Cargo,TransceiverClass';

// One snake_case row. Times are HH:MM on 2026-06-30 (UTC).
function row(id: string, hhmm: string, lat: number | string, lon: number | string, sog: number | string = 0, opts: { status?: number | string; type?: number | string; cog?: number | string; heading?: number | string } = {}) {
  return [id, `2026-06-30 ${hhmm}:00`, lon, lat, sog, opts.cog ?? '', opts.heading ?? '', '', '', '', opts.type ?? 30, opts.status ?? 0, '', '', '', '', 'A'].join(',');
}
const csv = (...rows: string[]) => [SNAKE, ...rows].join('\n') + '\n';

// A vessel sitting still near 24.55 N 81.80 W, one report every 10 minutes.
function stationary(id: string, from: number, to: number, status = 0, sog = 0.2) {
  const rows: string[] = [];
  for (let m = from; m <= to; m += 10) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    rows.push(row(id, `${hh}:${mm}`, 24.55 + (m % 20) * 1e-5, -81.8, sog, { status }));
  }
  return rows;
}

const tracksOf = (text: string) => buildTracks(parseAisCsv(text).points).tracks;
const track = (text: string, id = 'V1') => tracksOf(text).find(t => t.id === id)!;

describe('thresholds are written down', () => {
  it('uses the documented values', () => {
    expect(AIS_THRESHOLDS).toEqual({
      loiterMaxSpeedKn: 1,
      loiterMinMinutes: 60,
      loiterMaxRadiusKm: 1,
      gapMinutes: 30,
      maxReportedSpeedKn: 40,
      maxImpliedSpeedKn: 50,
      minJumpKm: 1,
      stationaryRadiusM: 250,
      stationaryMinHours: 12,
      scorePerBehaviour: 3.5,
    });
    expect(AIS_STATUS).toEqual({ AT_ANCHOR: 1, MOORED: 5, NOT_DEFINED: 15 });
  });
});

describe('parseAisCsv', () => {
  it('reads the 2025+ snake_case layout', () => {
    const { layout, points } = parseAisCsv(csv(row('V1', '00:00', 24.55, -81.8, 5.9, { cog: 47.5, heading: 45, status: 0 })));
    expect(layout).toBe('snake_case');
    expect(points[0]).toEqual({ id: 'V1', time: Date.UTC(2026, 5, 30, 0, 0, 0), lat: 24.55, lon: -81.8, sog: 5.9, cog: 47.5, heading: 45, status: 0, vesselType: 30 });
  });

  it('reads the 2018-2024 CamelCase layout (LAT before LON) to the same points', () => {
    const camel = `${CAMEL}\n367000001,2026-06-30T00:00:00,24.55,-81.8,5.9,47.5,45,NAME,IMO1,CALL,30,0,10,4,1.0,,A\n`;
    const snake = csv(row('367000001', '00:00', 24.55, -81.8, 5.9, { cog: 47.5, heading: 45, status: 0 }));
    expect(parseAisCsv(camel).layout).toBe('CamelCase');
    expect(parseAisCsv(camel).points).toEqual(parseAisCsv(snake).points);
  });

  it('treats the "not available" values as missing, not readings', () => {
    const { points, issues } = parseAisCsv(csv(row('V1', '00:00', 24.55, -81.8, 102.3, { cog: 360, heading: 511, status: 15 })));
    expect(points[0]).toMatchObject({ sog: null, cog: null, heading: null, status: null });
    expect(issues.unavailable).toEqual({ sog: 1, cog: 1, heading: 1 });
  });

  it('treats empty fields as missing', () => {
    expect(parseAisCsv(csv(row('V1', '00:00', 24.55, -81.8, '', { status: '' }))).points[0]).toMatchObject({ sog: null, cog: null, heading: null, status: null });
  });

  it('drops rows with bad coordinates and counts them', () => {
    const { points, issues } = parseAisCsv(
      csv(
        row('V1', '00:00', 91, -81.8),
        row('V1', '00:10', 24.55, 181),
        row('V1', '00:20', 'abc', -81.8),
        row('V1', '00:30', 0, 0),
        row('V1', '00:40', -95, 10),
        row('V1', '00:50', 24.55, -81.8),
      ),
    );
    expect(points).toHaveLength(1);
    expect(issues.badCoordinates).toBe(5);
  });

  it('drops rows with unreadable timestamps', () => {
    const text = `${SNAKE}\nV1,not-a-date,-81.8,24.55,0,,,,,,30,0,,,,,A\n${row('V1', '00:10', 24.55, -81.8)}\n`;
    const { points, issues } = parseAisCsv(text);
    expect(points).toHaveLength(1);
    expect(issues.badTimestamps).toBe(1);
  });

  it('accepts CRLF line endings and a missing final newline', () => {
    expect(parseAisCsv([SNAKE, row('V1', '00:00', 24.55, -81.8), row('V1', '00:10', 24.55, -81.8)].join('\r\n')).points).toHaveLength(2);
  });

  it('names the missing columns when the header is not AIS', () => {
    expect(() => parseAisCsv('Timestamp,Temperature,pH\n1,2,3\n')).toThrow(/missing columns: .*mmsi.*base_date_time/);
  });
});

describe('buildTracks', () => {
  it('sorts unsorted rows by time per vessel', () => {
    const t = track(csv(row('V1', '02:00', 24.55, -81.8), row('V2', '00:00', 25, -80), row('V1', '00:00', 24.55, -81.8), row('V1', '01:00', 24.55, -81.8)));
    expect(t.points.map(p => new Date(p.time).getUTCHours())).toEqual([0, 1, 2]);
  });

  it('keeps one point per duplicate timestamp and counts the rest', () => {
    const { tracks, duplicateTimestamps } = buildTracks(parseAisCsv(csv(row('V1', '00:00', 24.55, -81.8), row('V1', '00:00', 24.56, -81.8), row('V1', '00:10', 24.55, -81.8))).points);
    expect(tracks[0].points).toHaveLength(2);
    expect(duplicateTimestamps).toBe(1);
  });
});

describe('findGaps (possible AIS gap)', () => {
  it('flags a silence longer than 30 minutes between two reports', () => {
    expect(findGaps(track(csv(row('V1', '01:00', 24.55, -81.8), row('V1', '01:31', 24.55, -81.8))))).toEqual([
      { id: 'V1', start: Date.UTC(2026, 5, 30, 1, 0), end: Date.UTC(2026, 5, 30, 1, 31), minutes: 31 },
    ]);
  });

  it('does not flag exactly 30 minutes', () => {
    expect(findGaps(track(csv(row('V1', '01:00', 24.55, -81.8), row('V1', '01:30', 24.55, -81.8))))).toEqual([]);
  });

  it('does not treat the start or end of the day as a gap', () => {
    // First report at 06:00 and last at 18:00: the empty hours at either end are not gaps.
    expect(findGaps(track(csv(row('V1', '06:00', 24.55, -81.8), row('V1', '06:20', 24.55, -81.8), row('V1', '18:00', 24.55, -81.8))))).toHaveLength(1);
    expect(findGaps(track(csv(row('V1', '00:00', 24.55, -81.8), row('V1', '23:59', 24.55, -81.8))))[0].minutes).toBe(1439);
  });

  it('handles a vessel with a single point', () => {
    const t = track(csv(row('V1', '12:00', 24.55, -81.8)));
    expect(findGaps(t)).toEqual([]);
    expect(findLoitering(t)).toEqual([]);
    expect(findSpeedAnomalies(t)).toEqual([]);
  });
});

describe('findLoitering (possible loitering)', () => {
  it('flags at least 60 minutes below 1 knot within 1 km', () => {
    const events = findLoitering(track(csv(...stationary('V1', 0, 60))));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: 'V1', minutes: 60 });
  });

  it('does not flag 50 minutes', () => {
    expect(findLoitering(track(csv(...stationary('V1', 0, 50))))).toEqual([]);
  });

  it('skips moored vessels (status 5)', () => {
    expect(findLoitering(track(csv(...stationary('V1', 0, 180, AIS_STATUS.MOORED))))).toEqual([]);
  });

  it('skips vessels at anchor (status 1), a declared stationary state', () => {
    expect(findLoitering(track(csv(...stationary('V1', 0, 180, AIS_STATUS.AT_ANCHOR))))).toEqual([]);
  });

  it('does not count "not available" speeds (102.3) as slow', () => {
    expect(findLoitering(track(csv(...stationary('V1', 0, 120, 0, 102.3))))).toEqual([]);
  });

  it('does not flag a slow vessel that drifts more than 1 km', () => {
    const rows = Array.from({ length: 13 }, (_, i) => row('V1', `0${Math.floor((i * 10) / 60)}:${String((i * 10) % 60).padStart(2, '0')}`, 24.55 + i * 0.002, -81.8, 0.8));
    expect(findLoitering(track(csv(...rows)))).toEqual([]);
  });

  it('breaks a loitering stretch at an AIS gap', () => {
    const rows = [...stationary('V1', 0, 40), ...stationary('V1', 80, 120)];
    expect(findLoitering(track(csv(...rows)))).toEqual([]);
  });
});

describe('findSpeedAnomalies (speed anomaly)', () => {
  it('flags a reported speed above 40 knots', () => {
    const events = findSpeedAnomalies(track(csv(row('V1', '00:00', 24.55, -81.8, 45), row('V1', '00:01', 24.5507, -81.8, 45))));
    expect(events.filter(e => e.kind === 'reported')).toHaveLength(2);
  });

  it('does not flag high-speed craft (vessel types 40-49) for reported speed', () => {
    expect(findSpeedAnomalies(track(csv(row('V1', '00:00', 24.55, -81.8, 45, { type: 40 }))))).toEqual([]);
  });

  it('ignores the 102.3 "not available" speed', () => {
    expect(findSpeedAnomalies(track(csv(row('V1', '00:00', 24.55, -81.8, 102.3))))).toEqual([]);
  });

  it('flags an implied speed above 50 knots between points more than 1 km apart', () => {
    // About 33 km in 5 minutes, roughly 216 knots.
    const events = findSpeedAnomalies(track(csv(row('V1', '00:00', 24.55, -81.8, 10), row('V1', '00:05', 24.85, -81.8, 10))));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'implied' });
    expect(events[0].knots).toBeGreaterThan(200);
  });

  it('does not flag GPS jitter under 1 km even at a high implied speed', () => {
    // About 0.5 km in 30 seconds after the duplicate timestamp is removed.
    const text = `${SNAKE}\nV1,2026-06-30 00:00:00,-81.8,24.55,0,,,,,,30,0,,,,,A\nV1,2026-06-30 00:00:30,-81.8,24.5545,0,,,,,,30,0,,,,,A\n`;
    expect(findSpeedAnomalies(track(text))).toEqual([]);
  });

  it('never divides by zero on duplicate timestamps', () => {
    expect(findSpeedAnomalies(track(csv(row('V1', '00:00', 24.55, -81.8), row('V1', '00:00', 25.55, -81.8))))).toEqual([]);
  });
});

describe('aisRiskScore (0-10)', () => {
  it('adds 3.5 per distinct behaviour type, capped at 10', () => {
    expect(aisRiskScore({ loitering: 0, gaps: 0, speedAnomalies: 0 })).toBe(0);
    expect(aisRiskScore({ loitering: 4, gaps: 0, speedAnomalies: 0 })).toBe(3.5);
    expect(aisRiskScore({ loitering: 1, gaps: 2, speedAnomalies: 0 })).toBe(7);
    expect(aisRiskScore({ loitering: 1, gaps: 1, speedAnomalies: 1 })).toBe(10);
  });

  it('reaches the AIS alert threshold (7) only with two or more behaviour types', () => {
    expect(isAisAlert(aisRiskScore({ loitering: 9, gaps: 0, speedAnomalies: 0 }))).toBe(false);
    expect(isAisAlert(aisRiskScore({ loitering: 0, gaps: 1, speedAnomalies: 1 }))).toBe(true);
  });
});

describe('analyzeAis', () => {
  it('scores the file by its highest-scoring vessel and lists flagged vessels', () => {
    const text = csv(
      ...stationary('V1', 0, 60), // loitering only -> 3.5
      row('V2', '00:00', 25, -80, 5),
      row('V2', '01:00', 25.001, -80, 5), // gap only -> 3.5
      ...stationary('V3', 0, 60),
      row('V3', '03:00', 24.55, -81.8, 0.2), // loitering + gap -> 7
      row('V4', '00:00', 25.2, -80.5, 8),
      row('V4', '00:10', 25.21, -80.5, 8), // nothing
    );
    const a = analyzeAis(text);
    expect(a.riskScore).toBe(7);
    expect(a.vessels).toBe(4);
    expect(a.flagged.map(v => [v.id, v.score])).toEqual([
      ['V3', 7],
      ['V1', 3.5],
      ['V2', 3.5],
    ]);
    expect(a.dates).toEqual({ first: '2026-06-30', last: '2026-06-30' });
  });
});

describe('upload size', () => {
  it('accepts files up to 20 MB', () => {
    expect(MAX_AIS_UPLOAD_BYTES).toBe(20 * 1024 * 1024);
    expect(checkUploadSize(MAX_AIS_UPLOAD_BYTES)).toBeNull();
  });

  it('explains how to make a file that is too big smaller', () => {
    expect(checkUploadSize(MAX_AIS_UPLOAD_BYTES + 1)).toBe(
      'This file is 20.0 MB; the limit is 20 MB. Filter the AIS day file to your area or a few vessels first.',
    );
    expect(checkUploadSize(321_337_372)).toMatch(/^This file is 306\.5 MB; the limit is 20 MB\./);
  });
});

// Real data: frontend/src/data/ais-sample-2026-06-30.csv, 8 vessels from one
// MarineCadastre day (2026-06-30, Florida Keys), MMSI replaced by VESSEL-001...
describe('anonymised MarineCadastre sample (2026-06-30)', () => {
  const sample = readFileSync(new URL('../data/ais-sample-2026-06-30.csv', import.meta.url), 'utf8');
  const parsed = parseAisCsv(sample);
  const { tracks } = buildTracks(parsed.points);
  const t = (n: number) => tracks.find(x => x.id === `VESSEL-${String(n).padStart(3, '0')}`)!;

  it('has no MMSI, vessel name, IMO or call sign', () => {
    const header = sample.split('\n')[0].split(',');
    expect(header).not.toContain('vessel_name');
    expect(header).not.toContain('imo');
    expect(header).not.toContain('call_sign');
    expect(new Set(parsed.points.map(p => p.id))).toEqual(new Set(Array.from({ length: 8 }, (_, i) => `VESSEL-00${i + 1}`)));
  });

  it('parses every row of the 2025+ layout', () => {
    expect(parsed.layout).toBe('snake_case');
    expect(parsed.points).toHaveLength(1349);
    expect(parsed.issues).toMatchObject({ badCoordinates: 0, badTimestamps: 0, missingId: 0 });
  });

  // VESSEL-008 reports "at anchor" on every point while travelling at up to
  // 8.4 knots: the navigational status is set by the crew and can be stale.
  // (The only status-1 vessel in the Florida Keys extract; the at-anchor skip
  // itself is covered by the synthetic test above.)
  it('shows that the navigational status can be stale (at anchor while moving)', () => {
    const anchored = t(8);
    expect(anchored.points.every(p => p.status === AIS_STATUS.AT_ANCHOR)).toBe(true);
    expect(Math.max(...anchored.points.map(p => p.sog ?? 0))).toBe(8.4);
    expect(anchored.points.filter(p => p.sog !== null && p.sog >= 1)).toHaveLength(113);
    expect(findLoitering(anchored)).toEqual([]);
  });

  it('does not flag a moored vessel (status 5) for loitering, but does report its 447-minute gap', () => {
    const moored = t(6);
    expect(moored.points.every(p => p.status === AIS_STATUS.MOORED)).toBe(true);
    expect(findLoitering(moored)).toEqual([]);
    expect(findGaps(moored).map(g => g.minutes)).toEqual([447]);
  });

  it('finds possible loitering on a pleasure craft with no status', () => {
    expect(findLoitering(t(2)).map(e => e.minutes)).toEqual([74]);
  });

  it('finds reported speeds above 40 knots', () => {
    expect(findSpeedAnomalies(t(4)).map(e => [e.kind, e.knots])).toEqual([
      ['reported', 41.4],
      ['reported', 41.6],
      ['reported', 41],
    ]);
  });

  it('finds a position jump far beyond any ship speed', () => {
    const jumps = findSpeedAnomalies(t(5));
    expect(jumps.every(e => e.kind === 'implied' && e.knots > 250)).toBe(true);
    expect(jumps).toHaveLength(2);
  });

  it('flags nothing on a clean cargo transit', () => {
    const clean = t(7);
    expect([findLoitering(clean), findGaps(clean), findSpeedAnomalies(clean)]).toEqual([[], [], []]);
  });

  it('scores the sample 7 (two behaviour types on one vessel)', () => {
    const a = analyzeAis(sample);
    expect(a.riskScore).toBe(7);
    expect(a.dates).toEqual({ first: '2026-06-30', last: '2026-06-30' });
    expect(a.flagged.map(v => v.id)).not.toContain('VESSEL-007');
    expect(a.flagged.map(v => v.id)).not.toContain('VESSEL-008');
  });
});

// Stationary (likely tied up) vs loitering. Radius and duration come from the
// Florida Keys extract of 2026-06-30 (see TESTING.md): flagged vessels split
// into r90 <= 93 m and r90 >= 712 m with none between.
describe('stationary vessels are not loitering', () => {
  const at = (minutes: number) => {
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };
  // A pleasure boat at a marina: no status (Class B), speed 0, a few metres of GPS jitter.
  const marina = (id: string, hours: number, spikes = 0) => {
    const rows: string[] = [];
    for (let m = 0; m <= hours * 60; m += 10) {
      const spike = spikes > 0 && m % 300 === 150 && m / 300 < spikes;
      rows.push(row(id, at(m), spike ? 24.57 : 24.55 + ((m / 10) % 3) * 2e-5, -81.8, 0, { status: '' }));
    }
    return rows;
  };
  // A boat circling slowly on a 300 m radius for 14 hours (one lap an hour), so only
  // the radius, not the duration, separates it from a stationary boat.
  const circling = (id: string) => {
    const rows: string[] = [];
    for (let m = 0; m <= 14 * 60; m += 5) {
      const a = (m / 60) * 2 * Math.PI;
      rows.push(row(id, at(m), 24.55 + (0.3 / 111) * Math.sin(a), -81.8 + (0.3 / 101) * (1 - Math.cos(a)), 0.8, { status: '' }));
    }
    return rows;
  };

  it('treats a marina boat seen for 18 hours within a few metres as stationary', () => {
    const t = track(csv(...marina('V1', 18)));
    expect(isStationary(t)).toBe(true);
    expect(findLoitering(t)).toEqual([]);
  });

  it('ignores a few GPS spikes (uses the 90th percentile distance, not the maximum)', () => {
    const t = track(csv(...marina('V1', 18, 2)));
    expect(Math.max(...t.points.map(p => p.lat))).toBeCloseTo(24.57);
    expect(isStationary(t)).toBe(true);
  });

  it('still flags possible loitering for a still boat seen for less than 12 hours', () => {
    const t = track(csv(...marina('V1', 6)));
    expect(isStationary(t)).toBe(false);
    expect(findLoitering(t)).toHaveLength(1);
  });

  it('still flags possible loitering for a boat circling on a 300 m radius', () => {
    const t = track(csv(...circling('V1')));
    expect(isStationary(t)).toBe(false);
    expect(findLoitering(t).length).toBeGreaterThan(0);
  });

  it('keeps the AIS gap rule for stationary vessels', () => {
    const rows = marina('V1', 18).filter((_, i) => i < 40 || i > 46);
    const t = track(csv(...rows));
    expect(isStationary(t)).toBe(true);
    expect(findGaps(t)).toHaveLength(1);
  });

  it('lists stationary vessels in the analysis and does not flag a marina boat', () => {
    const a = analyzeAis(csv(...marina('MARINA', 18), ...circling('CIRCLE')));
    expect(a.stationary).toEqual(['MARINA']);
    expect(a.flagged.map(v => v.id)).toEqual(['CIRCLE']);
    expect(a.riskScore).toBe(3.5);
  });
});
