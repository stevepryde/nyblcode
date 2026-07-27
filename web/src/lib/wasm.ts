import type {
  SimulationResult,
  WorldInfo,
  LevelSummary,
  PuzzleConfig,
} from "@/types/game";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmModule: any = null;

export async function initWasm(): Promise<void> {
  if (wasmModule) return;
  const wasm = await import("@/wasm/nyblcode_wasm");
  await wasm.default();
  wasmModule = wasm;
}

export function runSimulation(
  puzzleId: string,
  code: string,
): SimulationResult {
  if (!wasmModule) throw new Error("WASM not initialized");
  return wasmModule.run_simulation(puzzleId, code) as SimulationResult;
}

export function runSimulationWithConfig(
  config: PuzzleConfig,
  code: string,
): SimulationResult {
  if (!wasmModule) throw new Error("WASM not initialized");
  return wasmModule.run_simulation_with_config(config, code) as SimulationResult;
}

export function getWorlds(): WorldInfo[] {
  if (!wasmModule) throw new Error("WASM not initialized");
  return wasmModule.get_worlds() as WorldInfo[];
}

export function getWorldLevels(worldId: string): LevelSummary[] {
  if (!wasmModule) throw new Error("WASM not initialized");
  return wasmModule.get_world_levels(worldId) as LevelSummary[];
}

export function getLevel(levelId: string): PuzzleConfig | null {
  if (!wasmModule) throw new Error("WASM not initialized");
  return wasmModule.get_level(levelId) as PuzzleConfig | null;
}

export function parseLevel(jsonString: string): PuzzleConfig {
  if (!wasmModule) throw new Error("WASM not initialized");
  const result = wasmModule.parse_level(jsonString) as PuzzleConfig | { error: string };
  if ("error" in result) throw new Error(result.error);
  return result;
}

export function serializeLevel(config: PuzzleConfig): string {
  if (!wasmModule) throw new Error("WASM not initialized");
  const result = wasmModule.serialize_level(config);
  if (typeof result === "object" && result !== null && "error" in result) {
    throw new Error((result as { error: string }).error);
  }
  return result as string;
}
