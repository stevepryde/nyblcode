/**
 * Game types for the puzzle playground.
 * Mirrors the Rust types in nyblcode-wasm/src/models.rs.
 */

export interface Position {
  x: number;
  y: number;
}

export type Direction = "up" | "down" | "left" | "right";

export type TileType =
  | "floor"
  | "wall"
  | "goal"
  | "pit"
  | "locked_door"
  | "gem_vault"
  | "diamond_vault";

export type TileItem = "gem" | "key" | "diamond";

export interface Tile {
  tile_type: TileType;
  item?: TileItem | null;
}

export interface Grid {
  width: number;
  height: number;
  tiles: Tile[][];
}

export interface BotState {
  position: Position;
  direction: Direction;
  gems: number;
  diamonds: number;
  keys: number;
  gems_deposited: number;
  diamonds_deposited: number;
  message: string | null;
}

export type GameActionKind =
  | { type: "move"; from: Position; to: Position; direction: Direction }
  | { type: "turn"; from: Direction; to: Direction }
  | { type: "grab"; position: Position }
  | { type: "drop"; position: Position }
  | { type: "say"; message: string }
  | { type: "wait"; ticks: number }
  | { type: "error"; message: string }
  | { type: "fall_into_pit"; position: Position }
  | { type: "unlock"; position: Position }
  | { type: "deposit"; position: Position; item: TileItem }
  | { type: "bump"; position: Position; direction: Direction; message: string };

export interface GameAction {
  line: number | null;
  action: GameActionKind;
}

export interface SimulationError {
  line: number | null;
  column: number | null;
  message: string;
  friendly_hint: string | null;
}

export interface SimulationResult {
  actions: GameAction[];
  final_state: BotState;
  final_grid: Grid;
  puzzle_completed: boolean;
  stars_met: boolean[];
  error: SimulationError | null;
}

export type PuzzleObjective =
  | { type: "reach_position"; x: number; y: number }
  | { type: "collect_all_gems" }
  | { type: "deposit_all_gems" }
  | { type: "deposit_all_diamonds" }
  | { type: "max_instructions"; instructions: number }
  | { type: "max_steps"; steps: number }
  | { type: "all"; conditions: PuzzleObjective[] };

export interface PuzzleConfig {
  puzzle_id: string;
  title: string;
  description: string;
  grid: Grid;
  bot_start: BotState;
  completion: PuzzleObjective;
  star_objectives: PuzzleObjective[];
  starter_code: string;
  hint: string | null;
  tutorial: string | null;
  /** Cosmetic theme for the level card/header. Not used by WASM engine. */
  theme?: WorldTheme;
}

export type WorldTheme =
  | "grassy_plains"
  | "crystal_caves"
  | "abandoned_station"
  | "volcanic_islands"
  | "cloud_city";

export type WorldUnlock =
  | { type: "open" }
  | { type: "after_levels"; count: number }
  | { type: "after_world"; world_id: string };

export interface WorldInfo {
  world_id: string;
  title: string;
  description: string;
  story_intro: string;
  theme: WorldTheme;
  sort_order: number;
  unlock: WorldUnlock;
  level_count: number;
}

export interface LevelSummary {
  puzzle_id: string;
  title: string;
  description: string;
}

// ─── Progress (localStorage) ──────────────────────────────────────────────

export interface LevelProgress {
  completed: boolean;
  stars: number;
  best_stars: boolean[];
}

export interface GameProgress {
  levels: Record<string, LevelProgress>;
}

// ─── Playback State ───────────────────────────────────────────────────────

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;
