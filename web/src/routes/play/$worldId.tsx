import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { PuzzlePlayground } from "@/components/game/puzzle-playground";
import { LevelSelectModal } from "@/components/game/level-select-modal";
import { getWorldLevels, getLevel, getWorlds } from "@/lib/wasm";
import {
  getProgress,
  getSavedCode,
  saveCode,
  markLevelComplete,
  resetWorldProgress,
} from "@/lib/progress";
import { WORLD_THEME_CLASS } from "@/lib/theme";
import { ColorModeToggle } from "@/components/ui/color-mode-toggle";
import { NyblIcon } from "@/components/ui/nybl-icon";
import type { PuzzleConfig, GameProgress } from "@/types/game";
import { ArrowLeft, List, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PlaySearch = { level?: string };

export const Route = createFileRoute("/play/$worldId")({
  component: PlayPage,
  validateSearch: (search: Record<string, unknown>): PlaySearch => ({
    level: typeof search["level"] === "string" ? search["level"] : undefined,
  }),
});

function PlayPage() {
  const { worldId } = Route.useParams();
  const { level: levelParam } = Route.useSearch();
  const navigate = useNavigate();

  const worlds = useMemo(() => getWorlds(), []);
  const world = useMemo(
    () => worlds.find((w) => w.world_id === worldId),
    [worlds, worldId],
  );
  const worldTitle = world?.title ?? worldId;
  const themeClass = world ? WORLD_THEME_CLASS[world.theme] ?? "" : "";

  const levels = useMemo(() => getWorldLevels(worldId), [worldId]);
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleConfig | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<GameProgress>({ levels: {} });
  const [currentSavedCode, setCurrentSavedCode] = useState<string | undefined>(
    undefined,
  );
  const [showLevelSelect, setShowLevelSelect] = useState(false);

  // Init: load progress and first puzzle
  useEffect(() => {
    const prog = getProgress();
    setProgress(prog);

    if (levels.length > 0) {
      let startIndex = 0;

      if (levelParam) {
        const paramIndex = levels.findIndex((l) => l.puzzle_id === levelParam);
        if (paramIndex !== -1) startIndex = paramIndex;
      } else {
        // Skip to first uncompleted level
        const firstUncompleted = levels.findIndex(
          (l) => !prog.levels[l.puzzle_id]?.completed,
        );
        if (firstUncompleted !== -1) startIndex = firstUncompleted;
      }

      setCurrentIndex(startIndex);
      const startLevel = levels[startIndex];
      if (startLevel) loadPuzzle(startLevel.puzzle_id, startIndex);
    }
    setIsLoading(false);
  }, [worldId]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadPuzzle(puzzleId: string, index: number) {
    const puzzle = getLevel(puzzleId);
    setCurrentPuzzle(puzzle);
    setCurrentIndex(index);
    setCurrentSavedCode(getSavedCode(puzzleId) ?? undefined);
    navigate({
      to: "/play/$worldId",
      params: { worldId },
      search: { level: puzzleId },
      replace: true,
    });
  }

  const handleNextPuzzle = () => {
    if (currentIndex < levels.length - 1) {
      const newIndex = currentIndex + 1;
      const level = levels[newIndex];
      if (level) loadPuzzle(level.puzzle_id, newIndex);
    }
  };

  const handleSelectPuzzle = (index: number) => {
    const level = levels[index];
    if (level) loadPuzzle(level.puzzle_id, index);
    setShowLevelSelect(false);
  };

  const handleResetWorld = useCallback(() => {
    const levelIds = levels.map((l) => l.puzzle_id);
    resetWorldProgress(worldId, levelIds);
    setProgress(getProgress());
    setCurrentIndex(0);
    const first = levels[0];
    if (first) loadPuzzle(first.puzzle_id, 0);
    setShowLevelSelect(false);
  }, [worldId, levels]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleComplete = useCallback(
    (starsMet: boolean[]) => {
      if (!currentPuzzle) return;
      markLevelComplete(currentPuzzle.puzzle_id, starsMet);
      setProgress(getProgress());
    },
    [currentPuzzle],
  );

  const handleSaveCode = useCallback(
    (code: string) => {
      if (!currentPuzzle) return;
      saveCode(currentPuzzle.puzzle_id, code);
    },
    [currentPuzzle],
  );

  const currentTitle =
    currentPuzzle?.title ?? levels[currentIndex]?.title;

  return (
    <div className={`h-screen bg-white dark:bg-zinc-950 flex flex-col overflow-hidden ${themeClass}`}>
      {/* Header */}
      <header className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/" })}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              {worldTitle}
            </Button>
            <span className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-indigo-400">
              <NyblIcon className="h-4 w-4" />
              nyblcode
            </span>
          </div>

          <div className="text-center">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Level {currentIndex + 1} of {levels.length}
            </span>
            {currentTitle && (
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">
                {currentTitle}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-1">
            <ColorModeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLevelSelect(true)}
              className="gap-1.5"
            >
              <List className="h-4 w-4" />
              Levels
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-600)] dark:text-[var(--theme-400)]" />
          </div>
        ) : currentPuzzle ? (
          <PuzzlePlayground
            key={currentPuzzle.puzzle_id}
            puzzle={currentPuzzle}
            worldName={worldTitle}
            onNextPuzzle={handleNextPuzzle}
            onWorldComplete={() => navigate({ to: "/" })}
            onComplete={handleComplete}
            onSaveCode={handleSaveCode}
            savedCode={currentSavedCode}
            hasNextPuzzle={currentIndex < levels.length - 1}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500 dark:text-zinc-400">No puzzles available</p>
          </div>
        )}
      </main>

      {/* Level Select Modal */}
      {showLevelSelect && (
        <LevelSelectModal
          levels={levels}
          currentIndex={currentIndex}
          progress={progress}
          onSelect={handleSelectPuzzle}
          onClose={() => setShowLevelSelect(false)}
          onReset={handleResetWorld}
        />
      )}
    </div>
  );
}
