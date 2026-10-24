# Testing and local checks

## Local workspace

`build.sh` copies `build-template/` into a temp dir and overlays the app
sources. `scripts/local-workspace.sh` does the same into a work dir outside the
repo (default `oceanmind-work` next to the repo; override with `OCEANMIND_WORK`
in the environment or in the gitignored `scripts/local-workspace.env`), so the
repo layout is unchanged. It runs pnpm 9.15.9 through corepack.

```bash
scripts/local-workspace.sh init                 # copy template + sources, pnpm install --frozen-lockfile
scripts/local-workspace.sh run typescript-check # each `run` re-syncs frontend/ and backend/ first
scripts/local-workspace.sh run lint
scripts/local-workspace.sh run build:skip-bindings
scripts/local-workspace.sh run test
scripts/local-workspace.sh run test:coverage
```

The Motoko canister itself is not compiled locally (`build.sh` expects `moc`
at a Linux path). Backend logic is tested through the `motoko` npm package
instead; see below.

## What is tested

| File | What it covers |
| --- | --- |
| `frontend/src/lib/risk.test.ts` | Satellite and coral risk scoring, module alert thresholds, averages, severity bands |
| `frontend/src/lib/fusion.test.ts` | Global risk indices, the six correlation rules, recommendation scenario selection |
| `frontend/src/lib/backend-rules.test.ts` | Runs `backend/analysis-rules.mo` in the Motoko interpreter; type-checks `main.mo` |
| `frontend/src/lib/backend-ownership.test.ts` | Runs `backend/ownership.mo` with two principals; source check that every save and history endpoint in `main.mo` calls it |
| `frontend/src/lib/labels.test.ts` | Source checks: simulated modules say "Simulated" and not "live"; recommendation contacts are `example.org` placeholders |
| `frontend/src/lib/crw.test.ts` | NOAA Coral Reef Watch: ERDDAP CSV parsing, grid snapping, nearest water cell, URL building, the coral risk rule, and the bundled extract |
| `frontend/src/lib/crwReading.test.ts` | Turning an extract reading into the Coral module's inputs and source label |
| `frontend/src/pages/CommandCenter.test.tsx` | Server-side render with mocked hooks: empty state for a user with no analyses, index once there is one |
| `frontend/src/pages/CoralModule.test.tsx` | Server-side render with mocked hooks: NOAA CRW tab and source badge |
| `frontend/src/lib/coralForm.test.ts` | Coral form transitions: Load NOAA CRW Reading, region change, save payload |
| `frontend/src/lib/ndbc.test.ts` | NOAA NDBC realtime2 parsing (MM, truncated last line), newest values, sample CSV, the bundled extract |
| `frontend/src/lib/iotForm.test.ts` | The IoT buoy risk rule and form transitions: Load NDBC Reading, station change, save payload |
| `frontend/src/pages/IoTModule.test.tsx` | Server-side render with mocked hooks: NOAA NDBC tab and source badge |
| `frontend/src/lib/ais.test.ts` | AIS parsing (both layouts, "not available" values, bad rows), the three behaviour rules, edge cases, risk score, upload cap, and the anonymised real sample |
| `frontend/src/lib/aisForm.test.ts` | AIS form transitions: file choice and size cap, analyse, every input change clearing results, save payload |
| `frontend/src/pages/AISModule.test.tsx` | Server-side render with mocked hooks: no "illegal fishing", sample credit, upload limit, source badge |

The scoring and fusion logic was moved out of the page components into
`frontend/src/lib/risk.ts` and `frontend/src/lib/fusion.ts` so it can be tested
without rendering React. Two pages (Command Center, Coral) are rendered to
static HTML with `react-dom/server` and mocked data hooks; there is no
browser DOM in the tests, so clicks are not exercised. Button handlers call
pure functions in `lib/coralForm.ts` and `lib/iotForm.ts`, which are tested.
`frontend/preview/` renders the real Coral and IoT pages with the data hooks
stubbed (no login or canister) so they can be driven in a browser:
`vite --config vite.preview.config.js`, then `/preview/coral.html` or
`/preview/iot.html`.

The backend tests exercise the rules modules that `main.mo` calls when saving
and reading records. They do not deploy or call a canister, and the
interpreter cannot vary the caller of an actor, so the wiring between
endpoints and rules is checked by reading `main.mo` source rather than by
calling the endpoints. `main.mo` type-checks with no errors and none of the
warnings `build.sh` promotes to errors (M0223, M0235, M0236, M0237). The type-check uses the moc
bundled in `motoko@5.0.0`, which is not the exact compiler `build.sh` uses.

Satellite inputs are simulated in the browser (`setTimeout` +
`Math.random`). Coral and IoT can use dated NOAA extracts and AIS analyses
uploaded CSVs (see Phase 2); the coral image path, the IoT CSV path and the
AIS stream tab are still simulated. Tests use fixed
inputs and saved responses, never the network.

## Bugs fixed (each confirmed by a failing test first)

1. **Mixed risk scales in the Fusion Engine.** Module scores are 0-10 and
   vessel scores are 0-1, but the fusion index added them directly and used
   0-1 thresholds (`> 0.7`, `>= 0.7` Critical) on 0-10 data. A 2/10 AIS record
   counted as "high-risk", all-low inputs were banded Critical, and the
   maximum possible index was 8.65 instead of 10. Vessel risk is now converted
   to the 0-10 scale before combining, and thresholds and bands are on 0-10.
2. **Coral analyses overwritten.** `coralAnalyses` was keyed by region, so a
   second analysis of a region replaced the first. Keys are now
   `<region>#<seq>` with a per-canister counter.
3. **Alert flag never stored.** The backend hardcoded `alertStatus = false` for
   coral, AIS and IoT. It now computes the flag with the same thresholds as the
   UI (coral >= 6, AIS/IoT >= 7); a test checks both sides agree at boundaries.

## Results: refine-and-test (measured 2026-10-22)

| Check | Before | After |
| --- | --- | --- |
| Tests | none | 37 passing, 0 failing (3 files) |
| Bug tests before fixes | - | 13 failing, 24 passing |
| Coverage, `lib/risk.ts` + `lib/fusion.ts` | - | 93.33% statements/lines, 96.05% branches, 96.77% functions |
| Coverage, all of `frontend/src` (excluding `components/ui`, `declarations`) | - | 3.63% lines (196/5399) |
| `tsc --noEmit` | 0 errors | 0 errors |
| ESLint | 0 errors, 3 warnings | 0 errors, 3 warnings |
| `vite build` | passes | passes |
| `main.mo` type-check (npm moc) | 0 errors | 0 errors |

## Phase 1: fix-gaps (measured 2026-10-22)

Each fix has its own commit; tests were written first and seen failing.

1. **Overwriting another user's record.** `saveAlert` and
   `saveSatellite/AIS/IoT/FusionAnalysis` stored under a client-supplied id
   with no owner check. They now trap unless the id is new or the caller owns
   it or is an admin (the rule `updateAlert` already used). Failing test before
   the fix: a second user's write was allowed.
2. **History visible to every user.** The five `get...AnalysisHistory` queries
   and `getAIRecommendations` returned every user's records. They now return
   the caller's own (admins see all). Failing tests before the fix: Alice saw
   Bob's record; Bob could read Alice's recommendation.
   No Candid interface change was needed. `getAllAlerts`, `getAlertsByType`
   and `getAlertsBySeverity` still return every user's alerts (unchanged).
3. **Two Global Marine Risk Index formulas.** Command Center used a plain mean
   of four modules; Fusion used a weighted sum with vessels. Both now call
   `globalMarineRiskIndex` (weighted). 5 tests failed before the change.
4. **Labels.** Pages that generate readings with `Math.random` (Satellite,
   Coral, AIS, IoT) no longer say "live"/"real-time" and say "Simulated"; the
   Live Ocean Map card text calls its hardcoded vessels sample data; AI
   recommendation contacts are `example.org` placeholders with a badge.
   12 label tests failed before the change.
5. **CI.** `.github/workflows/ci.yml` runs install (`--frozen-lockfile`),
   typecheck, lint, tests with coverage and the build on every push. On GitHub,
   run #1 failed in the build step (`pnpm copy:env`: "pnpm: Permission
   denied") because the pnpm shim written by `scripts/local-workspace.sh` was
   not executable on Linux. Fixed in 4fd69b0 (`chmod +x` on the shim); run #2
   passed in 1m 8s.
6. **Docs.** README and `.gitignore` added; `spec.md` API section now lists
   only the 30 endpoints that exist (8 non-existent ones removed).

| Check | Before Phase 1 | After Phase 1 |
| --- | --- | --- |
| Tests | 37 passing (3 files) | 77 passing, 0 failing (5 files) |
| Coverage, `lib/risk.ts` + `lib/fusion.ts` | 93.33% stmts/lines, 96.05% branches, 96.77% funcs | 93.33% stmts/lines, 96.05% branches, 96.77% funcs |
| Coverage, all of `frontend/src` (excl. `components/ui`, `declarations`, `test-utils`) | 3.63% lines (196/5399) | 3.62% lines (196/5402) |
| `tsc --noEmit` | 0 errors | 0 errors |
| ESLint | 0 errors, 3 warnings | 0 errors, 3 warnings |
| `vite build` | passes | passes |
| `main.mo` type-check incl. build.sh-promoted warnings | 0 | 0 |

## Phase 2: add-datasets, coral (measured 2026-10-23)

**Data source.** NOAA Coral Reef Watch (CRW) daily 5 km products, read from
NOAA CoastWatch ERDDAP. Free, no API key; the licence allows use without
restriction with credit to NOAA Coral Reef Watch.

- **Host substitution.** The planned host `coastwatch.pfeg.noaa.gov`
  (`NOAA_DHW`) could not be reached from this machine's shell or browser pane
  (connection timeout). NOAA's main CoastWatch ERDDAP, `coastwatch.noaa.gov`,
  was reachable and serves the CRW products as four datasets:
  `noaacrwdhwDaily` (Degree Heating Weeks), `noaacrwhotspotDaily`,
  `noaacrwsstanomalyDaily` and `noaacrwbaa7dDaily` (Bleaching Alert Area 7-day
  maximum, levels 0-4). ERDDAP's CSV format is the same on both hosts.
- **Dates.** On 2026-10-22 the coverage ended 2026-10-15 (DHW, HotSpot) and
  2026-10-20 (SST anomaly, BAA); a request for 2026-10-21 returned HTTP 404.
  The extract uses the latest date all four share: **2026-10-15**.
- **CORS.** ERDDAP responses carry no `Access-Control-Allow-Origin` header
  (checked with an `Origin` header on GET and on an OPTIONS preflight). A
  `fetch()` from a page in a real browser was blocked: "has been blocked by
  CORS policy: No 'Access-Control-Allow-Origin' header is present". So the app
  bundles a dated extract, `frontend/src/data/crw-extract.json` (3,225 bytes,
  all 10 coral regions), regenerated by `node scripts/update-crw-extract.mts`.
- **Grid.** Each region's point is snapped to the CRW cell centre (odd
  multiples of 0.025 degrees). If that cell is land (ERDDAP returns `NaN`),
  the nearest water cell within +/- 0.25 degrees is used and its distance is
  stored: Coral Triangle 5.56 km, Andaman & Nicobar 10.887 km, Hawaii 5.56 km,
  Seychelles 5.541 km; the other six use the snapped cell.
- **Risk rule** (in `lib/crw.ts`; this app's rule built on CRW thresholds, not
  a CRW product):
  - thermal stress (0-10) = min(DHW / 8, 1) x 10, where 8 degree C-weeks is
    CRW's Alert Level 2 threshold;
  - bleaching score (0-10) = max(BAA x 2.5, 7.5 if DHW >= 4, 10 if DHW >= 8),
    because the 7-day BAA drops back once HotSpots end while accumulated DHW
    still indicates bleaching risk (Florida Keys on 2026-10-15: DHW 14.83,
    BAA 1);
  - both feed the existing `coralRiskScore` (0.6 x bleaching + 0.4 x thermal).
  On 2026-10-15 this gives Florida Keys 10.0, Persian Gulf 10.0, Caribbean
  7.14, Red Sea 4.60, Coral Triangle / Maldives / Andaman / Hawaii 1.50, Great
  Barrier Reef and Seychelles 0.00.
- **Fixtures.** 9 unmodified ERDDAP CSV responses in
  `frontend/src/lib/__fixtures__/crw/` (Great Barrier Reef and Florida Keys
  cells for all four variables, plus a Honolulu box where 13 of 25 cells are
  land). `.gitattributes` keeps them byte-for-byte.
- **UI.** The Coral module's NOAA tab loads the extract for the selected
  region and shows DHW, BAA, HotSpot, SST anomaly and the cell used. A Source
  badge reads "NOAA CRW, data from 2026-10-15", "Simulated" (image path) or
  "Manual entry", and is saved as the analysis `dataType`.

| Check | End of Phase 1 + empty state (fix-gaps) | After coral (add-datasets) |
| --- | --- | --- |
| Tests | 81 passing (6 files) | 131 passing, 0 failing (9 files) |
| Coverage, `lib/risk.ts` + `lib/fusion.ts` | 93.33% stmts/lines, 96.05% branches, 96.77% funcs | 93.33% stmts/lines, 96.05% branches, 96.77% funcs |
| Coverage, `lib/crw.ts` / `crwReading.ts` / `coralRegions.ts` | - | 100% lines each; `crw.ts` 94.28% branches |
| Coverage, all of `frontend/src` (excl. `components/ui`, `declarations`, `test-utils`, tests) | not measured | 13.16% lines (724/5501) |
| `tsc --noEmit` | 0 errors | 0 errors |
| ESLint | 0 errors, 3 warnings | 0 errors, 3 warnings |
| `vite build` | passes | passes (JS bundle 1.8 MB unminified) |

### Coral page checked in a browser (2026-10-23)

The real Coral page was driven in the browser pane via the preview harness.
Florida Keys: badge "NOAA CRW, data from 2026-10-15", DHW 14.83, BAA level 1
of 4, HotSpot 0.00, SST anomaly 1.99, bleaching 10.0, thermal 10.0, risk
10.0 / 10 (red). Hawaii: cell 21.275, -157.875 "(nearest water cell, 5.6 km
away)", DHW 0.00, BAA 1, bleaching 2.5, thermal 0.0, risk 1.5 / 10.

**Bug found:** after loading Florida Keys and switching the region to Hawaii,
the form kept Florida's 10.0 / 10.0 under the NOAA CRW badge, and saving
stored them as Hawaii's reading with `alertStatus: true`. Fixed in 8d0e6a2:
changing region drops a loaded CRW reading (values reset to 0, "Manual
entry"). The two regression tests failed before the fix. Re-checked in the
browser: after the switch the form showed 0 / 0, Manual entry, risk 0.0, and
saved `dataType: "Manual entry"` with no alert.

## Phase 2: add-datasets, IoT (measured 2026-10-23)

**Data source.** NOAA National Data Buoy Center (NDBC) realtime2 files
(`https://www.ndbc.noaa.gov/data/realtime2/`, last 45 days). Free, no API key.

- **File format.** Whitespace-separated text, newest row first, a `#YY MM DD
  hh mm ...` header, a `#yr mo dy ...` units row, and `MM` for missing values.
  The listing had 945 standard meteorological `.txt` files (water temperature
  column `WTMP`) and 170 oceanographic `.ocean` files, all with the columns
  `DEPTH OTMP COND SAL O2% O2PPM CLCON TURB PH EH`.
- **Which variables exist.** In the newest rows of all 170 `.ocean` files
  (first 4 KB of each, fetched 2026-10-22): water temperature (`OTMP`) at 166
  stations, turbidity (`TURB`, FTU) at 67, dissolved oxygen (`O2%`/`O2PPM`) at
  66, pH (`PH`) at 64. 61 stations reported pH, oxygen and turbidity together,
  and those were coastal estuarine reserve stations. Of the 62 numeric-ID
  (open-ocean buoy) `.ocean` stations, 0 reported pH, 2 reported oxygen and 1
  reported turbidity.
- **Stations used.** Pacific: PPHH1 (Papahana, He'eia Reserve, O'ahu) and
  Caribbean: JOBP4 (Jobos Bay Reserve, Puerto Rico), both estuarine stations
  with all four variables. Atlantic: 41049 (300 nm SSE of Bermuda) and Indian
  Ocean: 14049 (12°S 65°E), water temperature only; 14049's newest row was
  2026-10-01. Their pH, oxygen and turbidity come from
  `frontend/src/data/iot-sample.csv`, headed "SAMPLE VALUES - NOT MEASURED",
  and the UI tags each such value "sample, not measured".
- **CORS.** NDBC sends no `Access-Control-Allow-Origin` header; a browser
  `fetch()` of `42036.txt` and `PPHH1.ocean` was blocked by CORS policy. So the
  app bundles `frontend/src/data/ndbc-extract.json`, regenerated by
  `node scripts/update-ndbc-extract.mts`.
- **Risk.** The IoT module's existing buoy rule, unchanged and now tested in
  `lib/risk.ts`: +3 above 30 °C, +2 outside pH 7.8-8.3, +2.5 above 30
  turbidity units, +2.5 below 6 mg/L oxygen, capped at 10. With the extract:
  JOBP4 7.5 (30.8 °C, pH 7.6, O2 3.7 mg/L), PPHH1 2.0 (pH 7.6), 41049 0.0,
  14049 0.0. The pH band is a seawater range, so estuarine pH readings below
  7.8 add risk.
- **Fixtures.** 5 saved responses in `frontend/src/lib/__fixtures__/ndbc/`
  (first 4 KB of PPHH1.ocean, JOBP4.ocean (whole file), 41049.txt, 14049.txt
  and 23019.txt, which has no water temperature).
- **Browser check.** IoT page via the preview harness: JOBP4 showed 30.8 °C,
  pH 7.6, 3.7 mg/L, 1 FTU (2026-10-21 15:30 UTC), risk 7.5 "Critical";
  switching to 41049 reset to 0 / "Manual entry"; loading 41049 showed 29.2 °C
  measured plus three values tagged "sample, not measured", badge "NOAA NDBC
  41049, data from 2026-10-22 + sample pH, oxygen, turbidity", risk 0.0, and
  saved `dataType: "temperature (NOAA NDBC 41049 2026-10-22 + sample values)"`.

| Check | After coral | After coral fix + IoT |
| --- | --- | --- |
| Tests | 131 passing (9 files) | 174 passing, 0 failing (13 files) |
| Coverage, `lib/risk.ts` + `lib/fusion.ts` | 93.33% stmts/lines, 96.05% branches, 96.77% funcs | 93.57% stmts/lines, 96.34% branches, 96.87% funcs |
| Coverage, `lib/ndbc.ts` / `iotForm.ts` / `coralForm.ts` | - | 100% / 89.61% / 95.83% lines |
| Coverage, all of `frontend/src` (excl. `components/ui`, `declarations`, `test-utils`, tests) | 13.16% lines (724/5501) | 18.96% lines (1065/5617) |
| `tsc --noEmit` | 0 errors | 0 errors |
| ESLint | 0 errors, 3 warnings | 0 errors, 3 warnings |
| `vite build` | passes | passes (JS bundle 1.8 MB unminified) |

## Phase 2: add-datasets, AIS (measured 2026-10-23)

**Data source.** MarineCadastre AIS broadcast points
(https://hub.marinecadastre.gov/pages/vesseltraffic), from NOAA's Office for
Coastal Management and BOEM, sourced from the U.S. Coast Guard's NAIS.
- **Terms:** the site disclaimer says the information is in the public domain
  and may be used freely, provided the user does not claim it as their own,
  imply government endorsement, or present modified data as official.
- **Coverage:** 2009-2026 (2026: January 1 to June 30), U.S. coastal waters
  only, and no live feed.
- **Files:** since 2015, one Zstandard-compressed CSV per day, one point per
  vessel per minute. Measured sizes: 239.2 MB (2026-01-01), 271.1 MB
  (2025-06-30), 321.3 MB (2026-06-30) compressed.

**Columns.** The files on the server for 2015, 2019, 2023 and 2026 all use
`mmsi, base_date_time, longitude, latitude, sog, cog, heading, vessel_name,
imo, call_sign, vessel_type, status, length, width, draft, cargo,
transceiver`. The data dictionary also documents an older 2018-2024 layout
(`MMSI, BaseDateTime, LAT, LON, SOG, ...`); the parser accepts both.

**Browser access.** The storage sends `Access-Control-Allow-Origin: *`, and a
browser `fetch()` and a 64 KB range request both worked. But this browser has
no zstd decoder (`DecompressionStream('zstd')` is unsupported), and each day
is 240-320 MB for all U.S. waters, so the page analyses a CSV the user
uploads (up to 20 MB).

**Sample.** One day, 2026-06-30 (321 MB), was streamed through zstd
decompression in Node without saving the full file. The rows inside a
Florida Keys box (lat 24.3-25.3, lon -82.2 to -80.2) were kept: 40,270 rows,
200 vessels. 8 vessels were chosen, one per behaviour plus a moored, an
at-anchor and a clean one. The result is
`frontend/src/data/ais-sample-2026-06-30.csv`: 1,349 rows, 111,743 bytes. MMSI
was replaced by `VESSEL-001`...`VESSEL-008`, and `vessel_name`, `imo` and
`call_sign` were dropped. It ships in the app bundle for the "Use sample
file" button. The whole-day totals printed by the stream were cut off by my
`tail` and were not kept; the statistics below are for the Florida Keys
extract.

**Rules** (`AIS_THRESHOLDS` in `frontend/src/lib/ais.ts`). They flag
behaviour to review, not wrongdoing.

| Rule (UI wording) | Threshold |
| --- | --- |
| Possible loitering | reported speed < 1 kn for >= 60 min, staying within 1 km of the first point; a missing speed, a gap over 30 min or leaving the radius ends the stretch |
| Possible AIS gap | > 30 min between two consecutive reports of one vessel; time before a vessel's first or after its last report is not a gap |
| Speed anomaly | reported speed > 40 kn (not for high-speed craft, vessel types 40-49), or implied speed between consecutive points > 50 kn when they are > 1 km apart |
| Stationary (likely tied up), added in the follow-ups | seen >= 12 h with 90% of positions within 250 m of the median position; such a vessel gets no possible loitering (gaps and speed anomalies still apply) |
| Risk score (0-10) | 3.5 per distinct behaviour type on a vessel, capped at 10; the file's score is its highest vessel. One type gives 3.5, two give 7.0 (the AIS alert threshold the backend also uses), three give 10 |

**Decisions.**
- **"Not available" values are missing, not readings:** SOG 102.3 and COG
  360.0 (from the MarineCadastre AIS FAQ), heading 511 (the FAQ's pre-2015
  default), plus out-of-range values and status 15 ("not defined").
- **Bad rows are dropped and counted:** coordinates that are non-numeric, out
  of range or exactly 0,0, and unreadable timestamps.
- **Duplicates and order:** per vessel, duplicate timestamps keep the first
  point, and rows are sorted by time.
- **Status codes:** taken from ITU-R M.1371, which NAIS uses; MarineCadastre's
  dictionary only says a lookup table is required. Moored (5) is skipped for
  loitering. **At anchor (1) is also skipped**: it is a declared stationary
  state, so a still vessel at anchor is expected. The cost is that a vessel
  wrongly reporting "at anchor" while loitering would be missed.

**What the rules found on real data (Florida Keys extract, 2026-06-30).**
- **Most vessels flagged:** 120 of 200 vessels, with 136 possible loitering
  stretches, 195 possible AIS gaps and 12 speed anomalies; the extract's
  score was 7.
- **Why, and the caveat that follows:** most flags are on sailing (type 36)
  and pleasure craft (type 37), and 26,946 of the 40,270 rows have no
  navigational status (small boats' Class B transceivers do not send one). So
  boats tied up at a marina all day read as possible loitering, and the
  moored skip cannot help. For a busy recreational area these thresholds
  over-flag; restricting to Class A transceivers or excluding types 36/37 are
  options not applied here.
- **Placeholders absent here:** no "not available" values (0 x 102.3,
  0 x 360, 0 x 511) and no bad coordinates; 7 duplicate timestamps.
- **The status can be stale:** the only "at anchor" vessel (VESSEL-008)
  reports status 1 on all 137 points while moving at up to 8.4 kn.
- **Plausible behaviour still gets flagged:** VESSEL-005 (passenger ship)
  shows two position jumps implying 258.7 and 341 kn, and VESSEL-004 (pleasure
  craft) reports 41.0-41.6 kn, which such a boat can do: a speed anomaly to
  review, not an error.

**Sample results** (before the stationary rule): 8 vessels, 1,348 positions
after 1 duplicate timestamp, 4 possible loitering, 11 possible AIS gaps,
5 speed anomalies, 6 vessels to review, risk 7.0. After the stationary rule:
1 possible loitering, 1 stationary vessel, still 6 vessels to review and
risk 7.0.

**Browser check** (preview harness, `frontend/preview/ais.html`).
- **Sample:** the button gave the label "MarineCadastre AIS sample (derived,
  anonymised), data from 2026-06-30", risk 7.0 "High", and the 6 flagged IDs.
- **Reset:** typing a region cleared the results to 0 / "Manual entry".
- **Save:** after re-analysing, the save recorded `region: "Florida Keys"`,
  `riskScore: 7`, `alertStatus: true`, and the source in `dataModule`.
- **Uploads**, handed to the file input as `File` objects:
  - a 21 MB file was refused before reading ("This file is 21.0 MB; the limit
    is 20 MB. ...");
  - a sensor CSV showed "Not a MarineCadastre AIS CSV: missing columns: mmsi,
    base_date_time, latitude, longitude";
  - the sample uploaded as a file was labelled "Uploaded AIS CSV, data from
    2026-06-30".

**Fusion wording:** changed in the follow-ups below (a457259).

| Check | After IoT | After AIS |
| --- | --- | --- |
| Tests | 174 passing (13 files) | 236 passing, 0 failing (16 files) |
| Coverage, `lib/risk.ts` + `lib/fusion.ts` | 93.57% stmts/lines, 96.34% branches, 96.87% funcs | 93.57% stmts/lines, 96.34% branches, 96.87% funcs |
| Coverage, `lib/ais.ts` / `aisForm.ts` | - | 100% / 100% lines (90.59% / 91.17% branches) |
| Coverage, all of `frontend/src` (excl. `components/ui`, `declarations`, `test-utils`, tests) | 18.96% lines (1065/5617) | 25.3% lines (1495/5907) |
| `tsc --noEmit` | 0 errors | 0 errors |
| ESLint | 0 errors, 3 warnings | 0 errors, 3 warnings |
| `vite build` | passes (JS 1.8 MB, dist 4.9 MB) | passes (JS 1.9 MB, dist 5.1 MB; the sample is bundled) |

## Phase 2 follow-ups (measured 2026-10-24)

### Fusion wording (a457259)

- **Labels changed:** the AIS + satellite correlation is now labelled
  "Suspicious vessel activity (AIS + satellite)" (the metric name, the alert
  type and the recommendation's risk type). The recommendation summary says
  the behaviour is to review, not evidence of wrongdoing, and its four steps
  are review steps instead of enforcement actions.
- **Stored identifiers unchanged:** correlationType `illegal_fishing`,
  scenario `illegal_fishing`, and alert ids `fusion_illegal_fishing_<time>`.
- **Stored text that changes for new records only:** a fusion alert's
  `source` text ("Fusion Engine: <type> | ...") and a snapshot's stored
  recommendation text. Already-saved records keep "Illegal Fishing".
- **A bug avoided by the change:** the snapshot save looked metrics up by
  display name, so renaming the label alone would have stored
  `satelliteAIS = 0`. Metrics now carry a stable `key`, and
  `correlationsFromMetrics()` maps snapshot fields by key. 7 tests failed
  before the change.
- **The phrase is still used elsewhere:** the Alerts page offers "Illegal
  Fishing" as an alert type (stored as the alert `type`), the Satellite page
  uses it in a toast, and `spec.md`'s product brief mentions it. These were
  not changed.

### Stationary vessels vs possible loitering (87d225b)

**What the data showed.** Every vessel the rules flagged in the Florida Keys
extract of 2026-06-30 (a scratch file with real MMSIs, not committed) was
measured for:
- its distance from its median position (the 90th percentile, "r90", and the
  maximum),
- the hours it was seen,
- the share of points below 1 kn.

Of the 91 vessels flagged for possible loitering:

| r90 | Vessels | Median hours seen | Median share of points below 1 kn |
| --- | --- | --- | --- |
| 0-10 m | 46 | 23.8 | 1.00 |
| 10-25 m | 10 | 23.9 | 1.00 |
| 25-50 m | 5 | 23.9 | 1.00 |
| 50-100 m | 1 (93 m) | 12.3 | 0.98 |
| 100-500 m | **0** | - | - |
| 500-1000 m | 2 | 24.0 | 0.98 |
| 1-5 km | 3 | 16.2-20.7 | 0.82-0.93 |
| > 5 km | 24 | 15.4 | 0.45 |

The low-r90 group is almost all sailing (type 36) and pleasure craft (type
37), plus two type 55 vessels: boats that are very likely tied up. Several
have r90 of 4-5 m but a maximum near 175 m, which is GPS spikes, so the rule
uses the 90th percentile rather than the maximum.

**Rule** (`AIS_THRESHOLDS.stationaryRadiusM`, `stationaryMinHours` in
`frontend/src/lib/ais.ts`). A vessel seen for at least 12 hours, with 90% of
its positions within 250 m of its median position, is stationary (likely
tied up) and gets no possible loitering. AIS gaps and speed anomalies still
apply, and the risk score rule and backend threshold are unchanged.
- **Radius (250 m), from the data:** no flagged vessel had r90 between 93 m
  and 712 m. 250 m sits inside that empty band, and 100 m, 250 m and 500 m
  gave identical results.
- **Duration (12 h), not from the data:** the tied-up group's hours ranged
  from 1.2 h to 24 h with no clean break. 12 h is "most of the day" for a
  one-day file. Sensitivity at 250 m:

| Duration | 6 h | 8 h | 12 h | 16 h | 20 h |
| --- | --- | --- | --- | --- | --- |
| Loitering-flagged vessels now stationary | 60 | 59 | 58 | 52 | 50 |
| No longer flagged at all | 39 | 39 | 39 | 37 | 36 |

**These thresholds were tuned on one day (2026-06-30) in one area (a Florida
Keys box, mostly recreational traffic) and may not generalise to other
areas, seasons or vessel mixes.**

**Tests:**
- **Stationary:** a marina boat seen 18 h within a few metres, including with
  two GPS spikes 2 km away.
- **Still possible loitering:** the same still boat seen for only 6 h, and a
  boat circling on a 300 m radius for 14 h (separated by radius, not
  duration).
- **Rules that still apply:** a stationary boat's AIS gap is still reported.
- **Analysis output:** `analyzeAis` lists stationary vessels separately.

**Before and after (same files, previous vs new `lib/ais.ts`):**

| Florida Keys extract, 200 vessels | Before | After |
| --- | --- | --- |
| Vessels flagged (to review) | 120 | 81 |
| Vessels with possible loitering | 91 | 33 |
| Possible loitering events | 136 | 51 |
| Possible AIS gaps | 195 | 195 |
| Speed anomalies | 12 | 12 |
| Vessels at score 7.0 / 3.5 | 35 / 85 | 16 / 65 |
| File risk score | 7 | 7 |
| Stationary (likely tied up) | - | 66 |

39 vessels are no longer flagged, and 19 are still flagged with a lower
score (for gaps). The 66 stationary vessels are the 58 previously flagged for
loitering plus 8 that were never flagged (mostly moored).

On the committed sample: possible loitering 4 -> 1, stationary 0 -> 1
(VESSEL-001, seen 14.9 h within 2 m, now 3.5 for its gaps instead of 7.0),
vessels to review 6 -> 6, risk 7.0 -> 7.0. Checked in the preview harness:
the AIS page shows "Possible loitering: 1" and "Stationary (likely tied up):
1".

| Check | After AIS | After follow-ups |
| --- | --- | --- |
| Tests | 236 passing (16 files) | 249 passing, 0 failing (16 files) |
| Coverage, `lib/risk.ts` + `lib/fusion.ts` | 93.57% stmts/lines, 96.34% branches, 96.87% funcs | 93.99% stmts/lines, 95.34% branches, 97.05% funcs |
| Coverage, `lib/ais.ts` | 100% lines, 90.59% branches | 100% lines, 91.66% branches |
| Coverage, all of `frontend/src` (excl. `components/ui`, `declarations`, `test-utils`, tests) | 25.3% lines (1495/5907) | 25.69% lines (1523/5928) |
| `tsc --noEmit` | 0 errors | 0 errors |
| ESLint | 0 errors, 3 warnings | 0 errors, 3 warnings |
| `vite build` | passes (JS 1.9 MB) | passes (JS 1.9 MB) |
