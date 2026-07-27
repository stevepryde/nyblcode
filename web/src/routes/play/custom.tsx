import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { PuzzlePlayground } from "@/components/game/puzzle-playground";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorModeToggle } from "@/components/ui/color-mode-toggle";
import { NyblIcon } from "@/components/ui/nybl-icon";
import { WORLD_THEME_CLASS } from "@/lib/theme";
import type { PuzzleConfig } from "@/types/game";

export const Route = createFileRoute("/play/custom")({
  component: CustomPlayPage,
});

function CustomPlayPage() {
  const navigate = useNavigate();
  const [puzzle, setPuzzle] = useState<PuzzleConfig | null>(() => {
    const raw = sessionStorage.getItem("nyblcode_custom_play");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PuzzleConfig;
    } catch {
      return null;
    }
  });

  const handleComplete = useCallback(() => {
    // No progress to save for custom levels
  }, []);

  const handleSaveCode = useCallback(() => {
    // No code saving for custom levels
  }, []);

  if (!puzzle) {
    return (
      <div className="h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center text-zinc-900 dark:text-white gap-4">
        <p className="text-zinc-500 dark:text-zinc-400">No custom level loaded.</p>
        <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  const theme = puzzle.theme ?? "grassy_plains";
  const themeClass = WORLD_THEME_CLASS[theme] ?? "";

  return (
    <div className={`h-screen bg-white dark:bg-zinc-950 flex flex-col overflow-hidden ${themeClass}`}>
      {/* Header */}
      <header className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                sessionStorage.removeItem("nyblcode_custom_play");
                setPuzzle(null);
                navigate({ to: "/" });
              }}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Button>
            <span className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-indigo-400">
              <NyblIcon className="h-4 w-4" />
              nyblcode
            </span>
          </div>

          <div className="text-center">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Custom Level</span>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">
              {puzzle.title}
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <ColorModeToggle />
            <div className="w-16" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        <PuzzlePlayground
          key="custom"
          puzzle={puzzle}
          worldName="Custom"
          onNextPuzzle={() => {}}
          onWorldComplete={() => {
            sessionStorage.removeItem("nyblcode_custom_play");
            navigate({ to: "/" });
          }}
          onComplete={handleComplete}
          onSaveCode={handleSaveCode}
          savedCode={undefined}
          hasNextPuzzle={false}
          repeatLabel="Play Again"
          completionLabel="Back to Home"
        />
      </main>
    </div>
  );
}
