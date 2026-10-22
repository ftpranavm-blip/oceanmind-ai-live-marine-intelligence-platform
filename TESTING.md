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

Satellite and AIS inputs in the app are simulated in the browser
(`setTimeout` + `Math.random`). Coral and IoT can use dated NOAA extracts
(see Phase 2); their image and CSV paths are still simulated. Tests use fixed
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
