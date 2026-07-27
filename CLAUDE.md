# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

nyblcode is an educational coding game where users write programs in "Nybl" (a simple language powered by the `nybl-lang` crate) to solve grid-based puzzles. A Rust backend compiles to WASM and runs simulations; a React frontend renders the grid, editor, and playback.

## Build & Development Commands

```bash
# Prerequisites: Rust with wasm32-unknown-unknown target, wasm-pack, Bun

make wasm          # Compile Rust → WASM (output: web/src/wasm/)
make test          # cargo test (Rust unit tests)
make dev           # Start Vite dev server on :8080
make build-all     # test + wasm + frontend build
make clean         # Remove all build artifacts

cd web && bun run lint   # ESLint
```

After changing any Rust code, run `make wasm` before testing in the browser. The WASM output in `web/src/wasm/` is gitignored and must be rebuilt locally.

## Architecture

```
crates/nyblcode-wasm/     Rust library compiled to WASM
  src/lib.rs             #[wasm_bindgen] exports: run_simulation, get_worlds, get_world_levels, get_level
  src/engine.rs          Simulation runner (parse → execute → collect actions → check objectives)
  src/host.rs            NyblCodeHost: implements nybl-lang's NyblHost trait with game commands (move, grab, look, etc.)
  src/models.rs          Shared types: Grid, BotState, GameAction, SimulationResult, PuzzleConfig, etc.
  src/levels.rs          Loads level JSON from data/courses/, parses map strings into Grid
  src/pre_parser.rs      Pre-parse checks for friendly error messages (typos, reserved words)
  data/courses/          Level pack JSON files

web/                     React 19 + TypeScript frontend (Vite, Tailwind CSS 4, Bun)
  src/lib/wasm.ts        Lazy-loads WASM module, wraps exported functions with TS types
  src/lib/progress.ts    localStorage-based save system (progress, code, speed)
  src/lib/monaco-nybl.ts  Monaco syntax highlighting for Nybl language
  src/types/game.ts      TypeScript types mirroring Rust models (must stay in sync)
  src/routes/            TanStack Router file-based routing (/, /play/$worldId)
  src/components/game/   Game UI: puzzle-playground (main view), game-grid (canvas renderer),
                         playback-controls, puzzle-objective, celebration-overlay, nybl-reference
  src/components/ui/     Reusable primitives (button, badge) using CVA
```

**Data flow:** User code → `runSimulation(puzzleId, code)` → WASM executes synchronously → returns `SimulationResult` with action list → frontend replays actions frame-by-frame on canvas.

## Key Patterns

- **WASM boundary:** Rust types serialize via `serde` + `serde-wasm-bindgen`. TypeScript types in `types/game.ts` must mirror the Rust `models.rs` structs.
- **Canvas rendering:** `game-grid.tsx` draws the entire grid + bot in a single `useEffect`, triggered by `[grid, botState, tileSize]`. No DOM elements for game tiles.
- **Playback:** Actions replay from scratch each frame (replay effect rebuilds state from `puzzle.bot_start` up to `currentActionIndex`).
- **State is local:** No global store. Component state + localStorage only. No backend API.
- **Level data:** Embedded in the WASM binary via `include_str!` in `levels.rs`. Map grids are ASCII strings parsed into `Grid` structs.

## Deployment

Cloudflare Pages via GitHub Actions. CI runs `cargo test`, builds WASM with wasm-pack, builds frontend with Vite, deploys on push to main.
