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

The scoring and fusion logic was moved out of the page components into
`frontend/src/lib/risk.ts` and `frontend/src/lib/fusion.ts` so it can be tested
without rendering React. React components themselves have no tests.

The backend tests exercise the rules module that `main.mo` calls when saving
analyses. They do not deploy or call a canister. The type-check uses the moc
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

## Results (measured 2026-10-22)

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
