#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
source_revision="$(git -C "${repo_root}" rev-parse HEAD)"
source_summary="$(git -C "${repo_root}" log -1 --format=%s)"
source_dirty="$([[ -n "$(git -C "${repo_root}" status --short)" ]] && printf true || printf false)"

cd "${repo_root}"
cargo test --workspace
make wasm

cd "${repo_root}/web"
bun install --frozen-lockfile
bun run lint
bun run build

bunx wrangler@4.114.0 pages deploy dist \
  --project-name nyblcode \
  --branch main \
  --commit-hash "${source_revision}" \
  --commit-message "${source_summary}" \
  --commit-dirty="${source_dirty}"
