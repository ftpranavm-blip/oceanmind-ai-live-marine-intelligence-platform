#!/usr/bin/env bash
# Local dev/test workspace that mirrors build.sh without restructuring the repo:
# build-template/ is copied into a work dir, then frontend/ and backend/ are
# overlaid onto src/frontend and src/backend.
#
# Usage:
#   scripts/local-workspace.sh init     # fresh copy + pnpm install
#   scripts/local-workspace.sh sync     # re-copy frontend/ and backend/ only
#   scripts/local-workspace.sh run <pnpm-script> [args...]   # sync, then run in src/frontend
#   scripts/local-workspace.sh paths    # print the resolved directories
#
# Env (or put KEY=value lines in scripts/local-workspace.env, which is gitignored):
#   OCEANMIND_WORK  work dir (default: oceanmind-work next to the repo)
#   PNPM_STORE      pnpm store dir (default: <work dir>-cache/pnpm-store)
#   COREPACK_HOME   corepack cache (default: <work dir>-cache/corepack)
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Machine-specific settings stay out of git. Variables already set in the
# environment (e.g. by CI) win over the file.
if [ -f "$REPO/scripts/local-workspace.env" ]; then
  while IFS='=' read -r key value; do
    case "$key" in '' | \#*) continue ;; esac
    value="${value%$'\r'}"
    [ -n "${!key:-}" ] || export "$key=$value"
  done < "$REPO/scripts/local-workspace.env"
fi
# `pwd -W` (Git Bash) gives a Windows path such as E:/... that Node understands;
# elsewhere plain `pwd` is used. Strip the trailing slash of a drive root (E:/).
PARENT="$(cd "$REPO/.." && (pwd -W 2>/dev/null || pwd))"
PARENT="${PARENT%/}"
WORK="${OCEANMIND_WORK:-$PARENT/oceanmind-work}"
STORE="${PNPM_STORE:-$WORK-cache/pnpm-store}"
export COREPACK_HOME="${COREPACK_HOME:-$WORK-cache/corepack}"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
PNPM=(corepack pnpm@9.15.9)

# package.json scripts call `pnpm` by name (e.g. build:skip-bindings), so expose a shim on PATH.
setup_pnpm() {
  local shim_dir="$COREPACK_HOME/pnpm-shim"
  mkdir -p "$shim_dir"
  printf '#!/bin/sh\nexec corepack pnpm@9.15.9 "$@"\n' > "$shim_dir/pnpm"
  # Linux needs the execute bit; on Windows (Git Bash/NTFS) chmod is a harmless no-op
  # and cmd.exe uses pnpm.cmd instead.
  chmod +x "$shim_dir/pnpm"
  printf '@corepack pnpm@9.15.9 %%*\r\n' > "$shim_dir/pnpm.cmd"
  export PATH="$(cygpath -u "$shim_dir" 2>/dev/null || echo "$shim_dir"):$PATH"
}

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
    setup_pnpm
    cd "$WORK"
    "${PNPM[@]}" install --frozen-lockfile --store-dir "$STORE"
    ;;
  sync)
    sync_sources
    ;;
  run)
    shift
    sync_sources
    setup_pnpm
    cd "$WORK/src/frontend"
    "${PNPM[@]}" run "$@"
    ;;
  paths)
    printf 'work=%s\nstore=%s\ncorepack=%s\n' "$WORK" "$STORE" "$COREPACK_HOME"
    ;;
  *)
    echo "usage: $0 init|sync|run <script> [args...]|paths" >&2
    exit 1
    ;;
esac
