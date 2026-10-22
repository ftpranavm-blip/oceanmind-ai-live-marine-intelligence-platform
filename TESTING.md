# Testing and local checks

## Local workspace

`build.sh` copies `build-template/` into a temp dir and overlays the app
sources. `scripts/local-workspace.sh` does the same into a work dir outside the
repo (default `F:/Claude/oceanmind-work`, override with `OCEANMIND_WORK`), so the
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

The scoring and fusion logic was moved out of the page components into
`frontend/src/lib/risk.ts` and `frontend/src/lib/fusion.ts` so it can be tested
without rendering React. React components themselves have no tests.

The backend tests exercise the rules modules that `main.mo` calls when saving
and reading records. They do not deploy or call a canister, and the
interpreter cannot vary the caller of an actor, so the wiring between
endpoints and rules is checked by reading `main.mo` source rather than by
calling the endpoints. `main.mo` type-checks with no errors and none of the
warnings `build.sh` promotes to errors (M0223, M0235, M0236, M0237). The type-check uses the moc
bundled in `motoko@5.0.0`, which is not the exact compiler `build.sh` uses.

Satellite, coral, AIS and IoT inputs in the app are simulated in the browser
(`setTimeout` + `Math.random`); the tests use fixed inputs.

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
