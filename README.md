# OceanMind AI

A marine risk dashboard prototype built on the Internet Computer. Users sign in
with Internet Identity, record satellite, coral, AIS (vessel tracking) and IoT
(ocean sensor) analyses, and a fusion engine combines them into a 0-10 Global
Marine Risk Index, correlation alerts and rule-based response recommendations.

**The input data is simulated.** No external data source is connected. See
[What is simulated](#what-is-simulated).

## What it does

| Page | What happens |
| --- | --- |
| Command Center | Global Marine Risk Index, module summaries, recent alerts |
| Satellite / Coral / AIS / IoT | Generate a simulated reading, adjust it, compute a risk score (0-10), save it with an alert flag |
| Live Ocean Map | Leaflet map of 5 hardcoded sample vessels and fixed temperature, current and pollution overlays |
| Fusion Engine | Weighted risk index, six cross-module correlation rules, fusion alerts, rule-based recommendations, saved snapshots |
| Alerts | Create, filter and update alerts |

## Architecture

```
frontend/   React 19 + TypeScript + Vite + Tailwind (shadcn/ui), TanStack Router and Query
  src/pages/      one page per module
  src/lib/        pure scoring and fusion logic (risk.ts, fusion.ts) + tests
  src/hooks/      React Query hooks that call the canister (polling every 8-10 s)
backend/    Motoko canister (main.mo)
  analysis-rules.mo   coral record keys and alert-flag thresholds
  ownership.mo        who may overwrite or read a stored record
  authorization/, blob-storage/   Caffeine platform mixins
build-template/   package.json, lockfile, Vite/TS/ESLint config and shadcn/ui
                  components that build.sh combines with frontend/ and backend/
```

Records are stored in the canister per user: each user's history queries return
their own records (admins see all), and a record id owned by one user cannot be
overwritten by another. Alerts are readable by every signed-in user. The full
endpoint list is in [spec.md](spec.md#backend-api-as-implemented-in-backendmainmo).

Risk scales: module risk scores are 0-10; vessel risk scores are 0-1 and are
converted to 0-10 before they enter the Global Marine Risk Index
(weights: satellite 0.25, coral 0.2, AIS 0.25, IoT 0.15, vessels 0.15).

## What is simulated

| Module | Source of the numbers |
| --- | --- |
| Satellite | `Math.random` in the browser. No imagery is analysed and no Earth Engine call is made. |
| Coral | Real data option: a dated NOAA Coral Reef Watch extract (2026-10-15) bundled in `frontend/src/data/crw-extract.json`, because browsers cannot call NOAA ERDDAP directly (CORS). The image path is still `Math.random`; no image model is used. |
| AIS | `Math.random` in the browser. Uploaded CSVs are not parsed yet. |
| IoT | Real data option: a dated NOAA NDBC buoy extract bundled in `frontend/src/data/ndbc-extract.json` (browsers cannot call NDBC directly, CORS). Two stations report pH, oxygen and turbidity; for the other two those values come from `iot-sample.csv` and are labelled "sample, not measured". Uploaded CSVs are not parsed; that path is `Math.random`. |
| Live Ocean Map | 5 fixed demo vessels and 5 fixed ocean points returned by `getMapData()`. |
| AI recommendations | Fixed rule-based text chosen from the active fusion alerts. Contacts are `example.org` placeholders. |

The UI labels these readings "Simulated".

## Data sources and credits

- **AIS (vessel traffic):** `frontend/src/data/ais-sample-2026-06-30.csv` is a
  small sample **derived** from the MarineCadastre AIS broadcast points for
  2026-06-30 (U.S. coastal waters), published by NOAA's Office for Coastal
  Management and the Bureau of Ocean Energy Management (BOEM) at
  https://hub.marinecadastre.gov/pages/vesseltraffic. It keeps 8 vessels in a
  Florida Keys box (1,349 rows). MMSI numbers were replaced with generated IDs
  (`VESSEL-001` ... `VESSEL-008`) and the `vessel_name`, `imo` and `call_sign`
  columns were removed. It is not an official government dataset, and its use
  here does not imply endorsement by or affiliation with NOAA, BOEM or the U.S.
  Coast Guard.
- **Coral:** NOAA Coral Reef Watch daily 5 km products via NOAA CoastWatch
  ERDDAP (https://coralreefwatch.noaa.gov).
- **Ocean sensors:** NOAA National Data Buoy Center realtime2 files
  (https://www.ndbc.noaa.gov).

**AIS rules flag behaviour to review, not wrongdoing.** "Possible loitering",
"possible AIS gap" and "speed anomaly" have ordinary explanations (a boat tied
up at a marina, a transponder switched off or out of receiver range, a GPS
glitch). The thresholds are in `frontend/src/lib/ais.ts` and TESTING.md.

## Running the checks

Needs Node.js with corepack (tested locally on Node 24; CI uses Node 22). Corepack provides pnpm 9.15.9. `scripts/local-workspace.sh`
reproduces the `build.sh` layout in a work dir outside the repo (default
`oceanmind-work` next to the repo; set `OCEANMIND_WORK`, `PNPM_STORE` and
`COREPACK_HOME` in the environment or in a gitignored
`scripts/local-workspace.env` to change it, and run `paths` to check).

```bash
bash scripts/local-workspace.sh init                  # copy + pnpm install --frozen-lockfile
bash scripts/local-workspace.sh run typescript-check
bash scripts/local-workspace.sh run lint
bash scripts/local-workspace.sh run test              # Vitest
bash scripts/local-workspace.sh run test:coverage
bash scripts/local-workspace.sh run build:skip-bindings
```

Backend logic is tested by running the Motoko modules in the interpreter from
the `motoko` npm package, so no `dfx` install is needed. The canister itself is
built and deployed by `build.sh` on the Caffeine platform. GitHub Actions
(`.github/workflows/ci.yml`) runs the same steps on every push.

Test scope, results and known limits are in [TESTING.md](TESTING.md).
