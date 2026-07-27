import type { PuzzleConfig, Tile } from "@/types/game";
import { parseLevel, serializeLevel } from "@/lib/wasm";

const STORAGE_KEY = "nyblcode_editor";

export function createDefaultConfig(): PuzzleConfig {
  const width = 5;
  const height = 5;
  const tiles: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      if (x === width - 1 && y === height - 1) {
        row.push({ tile_type: "goal" });
      } else {
        row.push({ tile_type: "floor" });
      }
    }
    tiles.push(row);
  }

  return {
    puzzle_id: "custom",
    title: "Untitled Puzzle",
    description: "A custom puzzle.",
    grid: { width, height, tiles },
    bot_start: {
      position: { x: 0, y: 0 },
      direction: "right",
      gems: 0,
      diamonds: 0,
      keys: 0,
      gems_deposited: 0,
      diamonds_deposited: 0,
      message: null,
    },
    completion: { type: "reach_position", x: width - 1, y: height - 1 },
    star_objectives: [],
    starter_code: "",
    hint: null,
    tutorial: null,
    theme: "grassy_plains",
  };
}

export function saveEditorState(config: PuzzleConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function loadEditorState(): PuzzleConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const config = JSON.parse(raw) as PuzzleConfig;
    if (!config.theme) config.theme = "grassy_plains";
    return config;
  } catch {
    return null;
  }
}

export function clearEditorState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function resizeGrid(config: PuzzleConfig, newW: number, newH: number): PuzzleConfig {
  const clone = structuredClone(config);
  const oldTiles = clone.grid.tiles;
  const tiles: Tile[][] = [];

  for (let y = 0; y < newH; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < newW; x++) {
      const existing = oldTiles[y]?.[x];
      row.push(existing ? { ...existing } : { tile_type: "floor" });
    }
    tiles.push(row);
  }

  clone.grid = { width: newW, height: newH, tiles };

  // Clamp bot position
  clone.bot_start.position.x = Math.min(clone.bot_start.position.x, newW - 1);
  clone.bot_start.position.y = Math.min(clone.bot_start.position.y, newH - 1);

  // Clamp reach_position objective if applicable
  if (clone.completion.type === "reach_position") {
    clone.completion.x = Math.min(clone.completion.x, newW - 1);
    clone.completion.y = Math.min(clone.completion.y, newH - 1);
  }

  return clone;
}

export function downloadConfigAsJson(config: PuzzleConfig): void {
  const json = serializeLevel(config);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${config.title.replace(/\s+/g, "-").toLowerCase() || "puzzle"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importConfigFromJson(file: File): Promise<PuzzleConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);

        // Detect concise course format by presence of `map` array
        if (Array.isArray(parsed.map)) {
          try {
            const config = parseLevel(text);
            if (!config.theme) config.theme = "grassy_plains";
            resolve(config);
          } catch (e) {
            reject(
              new Error(
                `Invalid level: ${e instanceof Error ? e.message : String(e)}`,
              ),
            );
          }
          return;
        }

        // Fall back to verbose PuzzleConfig format (backward compat)
        const config = parsed as PuzzleConfig;
        if (!config.grid || !config.bot_start || !config.completion) {
          reject(new Error("Invalid puzzle config: missing required fields"));
          return;
        }
        if (!config.grid.tiles || !config.grid.width || !config.grid.height) {
          reject(new Error("Invalid puzzle config: missing grid data"));
          return;
        }
        if (config.hint === undefined) config.hint = null;
        if (config.tutorial === undefined) config.tutorial = null;
        if (config.bot_start.message === undefined) config.bot_start.message = null;
        if (!config.theme) config.theme = "grassy_plains";
        resolve(config);
      } catch {
        reject(new Error("Failed to parse JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
