import { useState, useCallback, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { GameGrid } from "./game-grid";
import { PlaybackControls } from "./playback-controls";
import { PuzzleObjectivePanel } from "./puzzle-objective";
import { CelebrationOverlay } from "./celebration-overlay";
import { BopReference } from "./bop-reference";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { runSimulationWithConfig } from "@/lib/wasm";
import { registerBopLanguage } from "@/lib/monaco-bop";
import { useColorMode } from "@/lib/theme";
import type {
  PuzzleConfig,
  BotState,
  Grid,
  GameAction,
  GameActionKind,
  SimulationError,
  PlaybackSpeed,
} from "@/types/game";
import { Play, AlertCircle, Loader2, X } from "lucide-react";

interface PuzzlePlaygroundProps {
  puzzle: PuzzleConfig;
  worldName: string;
  onNextPuzzle: () => void;
  onWorldComplete: () => void;
  onComplete: (starsMet: boolean[]) => void;
  onSaveCode: (code: string) => void;
  savedCode?: string;
  hasNextPuzzle: boolean;
  repeatLabel?: string;
  completionLabel?: string;
}

export function PuzzlePlayground({
  puzzle,
  worldName,
  onNextPuzzle,
  onWorldComplete,
  onComplete,
  onSaveCode,
  savedCode,
  hasNextPuzzle,
  repeatLabel,
  completionLabel,
}: PuzzlePlaygroundProps) {
  // Code state
  const [code, setCode] = useState(savedCode ?? puzzle.starter_code);

  // Playback state
  const [actions, setActions] = useState<GameAction[]>([]);
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(() => {
    const saved = localStorage.getItem("bopcode_speed");
    if (saved) {
      const n = Number(saved);
      if (n === 0.5 || n === 1 || n === 2 || n === 4) return n as PlaybackSpeed;
    }
    return 1;
  });

  // Persist speed to localStorage
  useEffect(() => {
    localStorage.setItem("bopcode_speed", String(speed));
  }, [speed]);

  const [botState, setBotState] = useState<BotState>(puzzle.bot_start);
  const [grid, setGrid] = useState<Grid>(puzzle.grid);

  // UI state
  const [error, setError] = useState<SimulationError | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [starsMet, setStarsMet] = useState<boolean[]>(
    puzzle.star_objectives.map(() => false)
  );
  const [puzzleCompleted, setPuzzleCompleted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Refs for playback interval
  const playbackIntervalRef = useRef<number | null>(null);
  const celebrationShownRef = useRef(false);
  const simulationErrorRef = useRef<SimulationError | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  // Monaco editor ref for line highlighting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Collect outputs from say actions
  const outputs = useMemo(
    () => actions.filter((a) => a.action.type === "say").map((a) => a.action.type === "say" ? a.action.message : ""),
    [actions],
  );

  // Collect warnings from bump actions
  const warnings = useMemo(
    () => actions.filter((a) => a.action.type === "bump").map((a) => a.action.type === "bump" ? a.action.message : ""),
    [actions],
  );

  // Left panel tab state: show tutorial (instructions) tab by default if tutorial content exists
  const hasTutorial = puzzle.tutorial !== null;
  const [leftTab, setLeftTab] = useState<"puzzle" | "instructions">(
    hasTutorial ? "instructions" : "puzzle"
  );
  const hasRunRef = useRef(false);

  // ── Grid auto-sizing ──────────────────────────────────────────────────────
  // A ResizeObserver on the grid container div computes the tile size dynamically.
  // The deps array includes any state that controls whether the grid container
  // div is mounted (e.g. leftTab), so the observer attaches when it appears.
  const MIN_TILE = 32;
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [tileSize, setTileSize] = useState(48);
  const [gridOverflows, setGridOverflows] = useState(false);

  useLayoutEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const padding = 16;
      const maxTileW = (width - padding) / puzzle.grid.width;
      const maxTileH = (height - padding) / puzzle.grid.height;
      const fitted = Math.floor(Math.min(maxTileW, maxTileH));
      if (fitted >= MIN_TILE) {
        setTileSize(fitted);
        setGridOverflows(false);
      } else {
        setTileSize(MIN_TILE);
        setGridOverflows(true);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [puzzle.grid.width, puzzle.grid.height, leftTab]);

  // Reset when puzzle changes
  useEffect(() => {
    setCode(savedCode ?? puzzle.starter_code);
    setActions([]);
    setCurrentActionIndex(0);
    setBotState(puzzle.bot_start);
    setGrid(puzzle.grid);
    setError(null);
    setIsPlaying(false);
    setShowCelebration(false);
    setStarsMet(puzzle.star_objectives.map(() => false));
    setPuzzleCompleted(false);
    setLeftTab(puzzle.tutorial !== null ? "instructions" : "puzzle");
    hasRunRef.current = false;
  }, [puzzle, savedCode]);

  // Auto-save code with debounced 2s timer calling onSaveCode prop
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      onSaveCode(code);
    }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [code, onSaveCode]);

  // Playback logic -- animate through actions with setInterval based on speed
  useEffect(() => {
    if (isPlaying && currentActionIndex < actions.length) {
      const interval = 500 / speed;
      playbackIntervalRef.current = window.setInterval(() => {
        setCurrentActionIndex((prev) => {
          if (prev >= actions.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);

      return () => {
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
        }
      };
    } else if (currentActionIndex >= actions.length && isPlaying) {
      setIsPlaying(false);
    }
  }, [isPlaying, actions.length, speed, currentActionIndex]);

  // Update bot state based on current action index -- replays actions from scratch
  useEffect(() => {
    if (actions.length === 0) return;

    // Replay actions up to currentActionIndex
    const newBotState: BotState = { ...puzzle.bot_start, message: null };
    const newGrid = JSON.parse(JSON.stringify(puzzle.grid)) as Grid;

    for (let i = 0; i < currentActionIndex; i++) {
      const action = actions[i];
      if (action) {
        // When we reach an error action, show the structured error and stop
        if (action.action.type === "error") {
          setIsPlaying(false);
          setError(
            simulationErrorRef.current ?? {
              line: null,
              column: null,
              message: action.action.message,
              friendly_hint: null,
            }
          );
          break;
        }
        newBotState.message = null;
        applyAction(action.action, newBotState, newGrid);
      }
    }

    setBotState(newBotState);
    setGrid(newGrid);

    // Check if we've completed all actions (only celebrate once per simulation)
    if (currentActionIndex === actions.length && actions.length > 0) {
      if (puzzleCompleted && !celebrationShownRef.current) {
        celebrationShownRef.current = true;
        setShowCelebration(true);
        onComplete([puzzleCompleted, ...starsMet]);
      }
    }
  }, [currentActionIndex, actions, puzzle.bot_start, puzzle.grid, puzzleCompleted, starsMet, onComplete]);

  // Run code handler -- calls WASM synchronously, then stores actions for playback
  const handleRunCode = useCallback((autoPlay = true) => {
    // Reset state before running
    setIsRunning(true);
    setIsPlaying(false);
    setError(null);
    setActions([]);
    setCurrentActionIndex(0);
    setBotState(puzzle.bot_start);
    setGrid(puzzle.grid);
    setStarsMet(puzzle.star_objectives.map(() => false));
    setPuzzleCompleted(false);
    setShowCelebration(false);
    celebrationShownRef.current = false;
    simulationErrorRef.current = null;

    // Switch to puzzle tab on first run
    if (!hasRunRef.current) {
      hasRunRef.current = true;
      setLeftTab("puzzle");
    }

    try {
      const result = runSimulationWithConfig(puzzle, code);

      setActions(result.actions);
      setStarsMet(result.stars_met);
      setPuzzleCompleted(result.puzzle_completed);
      simulationErrorRef.current = result.error ?? null;

      // If no actions but there's an error, show it immediately
      if (result.actions.length === 0 && result.error) {
        setError(result.error);
      }

      // Start playback when we have actions
      if (result.actions.length > 0) {
        setCurrentActionIndex(autoPlay ? 0 : 1);
        setBotState(puzzle.bot_start);
        setGrid(puzzle.grid);
        if (autoPlay) setIsPlaying(true);
      }
    } catch (err) {
      setError({
        line: null,
        column: null,
        message: err instanceof Error ? err.message : "Unknown error running simulation",
        friendly_hint: null,
      });
    } finally {
      setIsRunning(false);
    }
  }, [puzzle, code]);

  // Playback handlers
  const handlePlay = () => {
    if (actions.length === 0) {
      handleRunCode(true);
    } else {
      setIsPlaying(true);
    }
  };
  const handlePause = () => setIsPlaying(false);
  const handleStep = () => {
    if (actions.length === 0) {
      handleRunCode(false);
      return;
    }
    if (currentActionIndex < actions.length) {
      setCurrentActionIndex((prev) => prev + 1);
    }
  };
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentActionIndex(0);
    setBotState(puzzle.bot_start);
    setGrid(puzzle.grid);
    setShowCelebration(false);
  };

  const handleRepeatLevel = () => {
    setShowCelebration(false);
    setIsPlaying(false);
    setActions([]);
    setCurrentActionIndex(0);
    setBotState(puzzle.bot_start);
    setGrid(puzzle.grid);
    setError(null);
    setPuzzleCompleted(false);
    celebrationShownRef.current = false;
  };

  const colorMode = useColorMode();
  const monacoTheme = colorMode === "dark" ? "vs-dark" : "vs";

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // Highlight the current line in the editor during playback
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Find the line for the current action (look at the action just played)
    const actionIndex = currentActionIndex - 1;
    const action = actionIndex >= 0 ? actions[actionIndex] : undefined;
    const line = action?.line;

    if (line && line > 0) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
        {
          range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
          options: {
            isWholeLine: true,
            className: "highlighted-line",
          },
        },
      ]);
      editor.revealLineInCenterIfOutsideViewport(line);
    } else {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
  }, [currentActionIndex, actions]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 relative">
      {/* Main playground area */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 p-4">
        {/* Left Panel: Tab Bar + Content */}
        <div className="flex flex-col lg:w-1/2 min-h-0">
          {/* Tab Bar */}
          {hasTutorial && (
            <div className="shrink-0 flex gap-1 mb-2">
              <button
                onClick={() => setLeftTab("instructions")}
                className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors cursor-pointer ${
                  leftTab === "instructions"
                    ? "bg-[var(--theme-500)]/20 text-[var(--theme-700)] dark:text-[var(--theme-300)] border-b-2 border-[var(--theme-500)] dark:border-[var(--theme-400)]/70"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                Instructions
              </button>
              <button
                onClick={() => setLeftTab("puzzle")}
                className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors cursor-pointer ${
                  leftTab === "puzzle"
                    ? "bg-[var(--theme-500)]/20 text-[var(--theme-700)] dark:text-[var(--theme-300)] border-b-2 border-[var(--theme-500)] dark:border-[var(--theme-400)]/70"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                Puzzle
              </button>
            </div>
          )}

          {/* Instructions Tab */}
          {leftTab === "instructions" && hasTutorial ? (
            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700/40 bg-zinc-50 dark:bg-zinc-900/50 p-6">
              <div className="prose max-w-none
                prose-headings:text-zinc-800 prose-p:text-zinc-600 prose-strong:text-zinc-800
                prose-li:text-zinc-600 prose-th:text-zinc-600 prose-td:text-zinc-500
                prose-code:text-[var(--theme-700)] prose-code:bg-zinc-200 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-zinc-100 prose-pre:text-zinc-800 prose-pre:rounded-lg
                [&_pre_code]:p-0 [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_pre_code]:rounded-none
                prose-a:text-[var(--theme-700)] prose-a:no-underline hover:prose-a:underline
                prose-hr:border-zinc-300
                dark:prose-headings:text-zinc-100 dark:prose-p:text-zinc-300 dark:prose-strong:text-zinc-100
                dark:prose-li:text-zinc-300 dark:prose-th:text-zinc-300 dark:prose-td:text-zinc-400
                dark:prose-code:text-[var(--theme-300)] dark:prose-code:bg-zinc-800
                dark:prose-pre:bg-zinc-800 dark:prose-pre:text-zinc-200
                dark:prose-a:text-[var(--theme-300)]
                dark:prose-hr:border-zinc-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {puzzle.tutorial!}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <>
              {/* Puzzle Tab: Objectives + Grid + Controls */}
              <div className="shrink-0">
                <PuzzleObjectivePanel
                  title={puzzle.title}
                  description={puzzle.description}
                  completion={puzzle.completion}
                  starObjectives={puzzle.star_objectives}
                  starsMet={starsMet}
                  puzzleCompleted={puzzleCompleted}
                  goalContext={{
                    botState,
                    grid,
                    instructions: code.split("\n").length,
                    steps: currentActionIndex,
                  }}
                  hint={puzzle.hint}
                  showHint={error !== null}
                  collapsed={!showInstructions}
                  onToggle={() => setShowInstructions((v) => !v)}
                />
              </div>

              {/* Game Grid -- scales to fit, scrolls at minimum tile size */}
              <div
                ref={gridContainerRef}
                className={`flex-1 min-h-0 flex justify-center ${gridOverflows ? "overflow-auto items-start py-2" : "items-center"}`}
              >
                <GameGrid grid={grid} botState={botState} tileSize={tileSize} />
              </div>

              {/* Playback Controls -- always visible at bottom */}
              <div className="shrink-0 pt-2">
                <PlaybackControls
                  isPlaying={isPlaying}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onStep={handleStep}
                  onReset={handleReset}
                  speed={speed}
                  onSpeedChange={setSpeed}
                  currentAction={currentActionIndex}
                  totalActions={actions.length}
                  disabled={isRunning}
                  inventory={{ gems: botState.gems, diamonds: botState.diamonds, keys: botState.keys }}
                  outputs={outputs}
                  warnings={warnings}
                />
              </div>
            </>
          )}
        </div>

        {/* Right Panel: Code Editor */}
        <div className="flex flex-col lg:w-1/2 min-h-0">
          {/* Code Editor */}
          <div className="flex-1 min-h-[200px] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700/40">
            <Editor
              height="100%"
              language="bop"
              theme={monacoTheme}
              value={code}
              onChange={(val) => setCode(val ?? "")}
              beforeMount={registerBopLanguage}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                lineNumbers: "on",
                wordWrap: "on",
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-3 bg-red-900/40 border border-red-400/50 rounded-lg p-3 relative">
              <button
                onClick={() => setError(null)}
                className="absolute top-2 right-2 text-red-400 hover:text-red-300 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-2 pr-5">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium text-sm">
                    {error.line && `Line ${error.line}: `}
                    {error.message}
                  </p>
                  {error.friendly_hint && (
                    <p className="text-amber-300 text-xs mt-1">
                      {error.friendly_hint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Run Button */}
          <div className="shrink-0 pt-2">
            <Button
              onClick={() => handleRunCode()}
              disabled={isRunning}
              className="w-full h-12 text-base font-bold"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Run Code
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Language Reference -- below the playground */}
      <BopReference />

      {/* Celebration Overlay */}
      <CelebrationOverlay
        isVisible={showCelebration}
        onNextPuzzle={onNextPuzzle}
        onWorldComplete={onWorldComplete}
        onRepeatLevel={handleRepeatLevel}
        repeatLabel={repeatLabel}
        completionLabel={completionLabel}
        worldName={worldName}
        hasNextPuzzle={hasNextPuzzle}
        starsMet={[puzzleCompleted, ...starsMet]}
      />
    </div>
  );
}

// Helper function to apply an action to bot state and grid
function applyAction(action: GameActionKind, bot: BotState, grid: Grid) {
  switch (action.type) {
    case "move":
      bot.position = action.to;
      bot.direction = action.direction;
      break;
    case "turn":
      bot.direction = action.to;
      break;
    case "grab": {
      const grabRow = grid.tiles[action.position.y];
      if (grabRow) {
        const grabTile = grabRow[action.position.x];
        if (grabTile) {
          if (grabTile.item === "key") bot.keys += 1;
          else if (grabTile.item === "diamond") bot.diamonds += 1;
          else bot.gems += 1;
          grabTile.item = undefined;
        }
      }
      break;
    }
    case "drop": {
      const dropRow = grid.tiles[action.position.y];
      if (dropRow) {
        const dropTile = dropRow[action.position.x];
        if (dropTile) {
          dropTile.item = "gem";
        }
      }
      bot.gems = Math.max(0, bot.gems - 1);
      break;
    }
    case "say":
      bot.message = action.message;
      break;
    case "fall_into_pit":
      bot.position = action.position;
      break;
    case "unlock": {
      const unlockRow = grid.tiles[action.position.y];
      if (unlockRow) {
        const unlockTile = unlockRow[action.position.x];
        if (unlockTile) unlockTile.tile_type = "floor";
      }
      bot.keys = Math.max(0, bot.keys - 1);
      break;
    }
    case "deposit":
      if (action.item === "gem") {
        bot.gems = Math.max(0, bot.gems - 1);
        bot.gems_deposited += 1;
      } else if (action.item === "diamond") {
        bot.diamonds = Math.max(0, bot.diamonds - 1);
        bot.diamonds_deposited += 1;
      }
      break;
    case "bump":
      bot.direction = action.direction;
      bot.message = action.message;
      break;
    case "wait":
    case "error":
      break;
  }
}
