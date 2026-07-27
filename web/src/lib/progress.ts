import type { GameProgress, LevelProgress } from "@/types/game";

const PROGRESS_KEY = "nyblcode_progress";
const CODE_PREFIX = "nyblcode_code_";

export function getProgress(): GameProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw) as GameProgress;
  } catch {
    // ignore parse errors
  }
  return { levels: {} };
}

export function saveProgress(progress: GameProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function getLevelProgress(levelId: string): LevelProgress | null {
  const progress = getProgress();
  return progress.levels[levelId] ?? null;
}

export function markLevelComplete(
  levelId: string,
  starsMet: boolean[],
): void {
  const progress = getProgress();
  const existing = progress.levels[levelId];

  // Preserve best stars across attempts
  const bestStars = existing?.best_stars
    ? starsMet.map((met, i) => met || (existing.best_stars[i] ?? false))
    : starsMet;

  progress.levels[levelId] = {
    completed: true,
    stars: bestStars.filter(Boolean).length,
    best_stars: bestStars,
  };

  saveProgress(progress);
}

export function getSavedCode(levelId: string): string | null {
  return localStorage.getItem(CODE_PREFIX + levelId);
}

export function saveCode(levelId: string, code: string): void {
  localStorage.setItem(CODE_PREFIX + levelId, code);
}

export function resetWorldProgress(
  _worldId: string,
  levelIds: string[],
): void {
  const progress = getProgress();
  for (const id of levelIds) {
    delete progress.levels[id];
    localStorage.removeItem(CODE_PREFIX + id);
  }
  saveProgress(progress);
}

export function getPlaybackSpeed(): number {
  try {
    const raw = localStorage.getItem("nyblcode_speed");
    if (raw) return parseFloat(raw);
  } catch {
    // ignore
  }
  return 1;
}

export function savePlaybackSpeed(speed: number): void {
  localStorage.setItem("nyblcode_speed", String(speed));
}