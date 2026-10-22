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
| IoT | `Math.random` in the browser. Uploaded CSVs are not parsed; no NOAA buoy call is made. |
| Live Ocean Map | 5 fixed demo vessels and 5 fixed ocean points returned by `getMapData()`. |
| AI recommendations | Fixed rule-based text chosen from the active fusion alerts. Contacts are `example.org` placeholders. |

The UI labels these readings "Simulated".

## Running the checks

Needs Node.js with corepack (tested locally on Node 24; CI uses Node 22). Corepack provides pnpm 9.15.9. `scripts/local-workspace.sh`
reproduces the `build.sh` layout in a work dir outside the repo (default
`F:/Claude/oceanmind-work`; set `OCEANMIND_WORK` to change it).

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
