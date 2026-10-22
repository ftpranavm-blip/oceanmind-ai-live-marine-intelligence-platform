#!/usr/bin/env bash
# Local dev/test workspace that mirrors build.sh without restructuring the repo:
# build-template/ is copied into a work dir, then frontend/ and backend/ are
# overlaid onto src/frontend and src/backend.
#
# Usage:
#   scripts/local-workspace.sh init     # fresh copy + pnpm install
#   scripts/local-workspace.sh sync     # re-copy frontend/ and backend/ only
#   scripts/local-workspace.sh run <pnpm-script> [args...]   # sync, then run in src/frontend
#
# Env:
#   OCEANMIND_WORK  work dir (default F:/Claude/oceanmind-work)
#   PNPM_STORE      pnpm store dir (default F:/Claude/.pnpm-store)
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="${OCEANMIND_WORK:-F:/Claude/oceanmind-work}"
STORE="${PNPM_STORE:-F:/Claude/.pnpm-store}"
export COREPACK_HOME="${COREPACK_HOME:-F:/Claude/.corepack}"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
PNPM=(corepack pnpm@9.15.9)
# package.json scripts call `pnpm` by name (e.g. build:skip-bindings), so expose a shim on PATH.
SHIM_DIR="$COREPACK_HOME/pnpm-shim"
mkdir -p "$SHIM_DIR"
printf '#!/bin/sh\nexec corepack pnpm@9.15.9 "$@"\n' > "$SHIM_DIR/pnpm"
printf '@corepack pnpm@9.15.9 %%*\r\n' > "$SHIM_DIR/pnpm.cmd"
export PATH="$(cygpath -u "$SHIM_DIR" 2>/dev/null || echo "$SHIM_DIR"):$PATH"

sync_sources() {
  # Same order as build.sh: template first, then the repo's sources on top.
  rm -rf "$WORK/src/frontend/src"
  cp -rf "$REPO/build-template/src/frontend/src" "$WORK/src/frontend/src"
  cp -rf "$REPO/frontend/." "$WORK/src/frontend/"
  mkdir -p "$WORK/src/backend"
  cp -rf "$REPO/backend/." "$WORK/src/backend/"
}

case "${1:-}" in
  init)
    rm -rf "$WORK"
    mkdir -p "$WORK"
    cp -rf "$REPO/build-template/." "$WORK/"
    sync_sources
    cd "$WORK"
    "${PNPM[@]}" install --frozen-lockfile --store-dir "$STORE"
    ;;
  sync)
    sync_sources
    ;;
  run)
    shift
    sync_sources
    cd "$WORK/src/frontend"
    "${PNPM[@]}" run "$@"
    ;;
  *)
    echo "usage: $0 init|sync|run <script> [args...]" >&2
    exit 1
    ;;
esac
