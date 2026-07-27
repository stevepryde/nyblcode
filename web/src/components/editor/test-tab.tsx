import { useState, useCallback, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { GameGrid } from "@/components/game/game-grid";
import { PlaybackControls } from "@/components/game/playback-controls";
import { PuzzleObjectivePanel } from "@/components/game/puzzle-objective";
import { CelebrationOverlay } from "@/components/game/celebration-overlay";
import { runSimulationWithConfig } from "@/lib/wasm";
import { registerNyblLanguage } from "@/lib/monaco-nybl";
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
import { Play, AlertCircle, Loader2, X, Code } from "lucide-react";

interface TestTabProps {
  config: PuzzleConfig;
  onConfigChange: (config: PuzzleConfig) => void;
  code: string;
  onCodeChange: (code: string) => void;
}

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

export function TestTab({ config, onConfigChange, code, onCodeChange }: TestTabProps) {
  const colorMode = useColorMode();
  const [actions, setActions] = useState<GameAction[]>([]);
  const outputs = useMemo(
    () => actions.filter((a) => a.action.type === "say").map((a) => a.action.type === "say" ? a.action.message : ""),
    [actions],
  );
  const warnings = useMemo(
    () => actions.filter((a) => a.action.type === "bump").map((a) => a.action.type === "bump" ? a.action.message : ""),
    [actions],
  );
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(() => {
    const saved = localStorage.getItem("nyblcode_speed");
    if (saved) {
      const n = Number(saved);
      if (n === 0.5 || n === 1 || n === 2 || n === 4) return n as PlaybackSpeed;
    }
    return 1;
  });
  const [botState, setBotState] = useState<BotState>(config.bot_start);
  const [grid, setGrid] = useState<Grid>(config.grid);
  const [error, setError] = useState<SimulationError | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [starsMet, setStarsMet] = useState<boolean[]>(config.star_objectives.map(() => false));
  const [puzzleCompleted, setPuzzleCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const playbackIntervalRef = useRef<number | null>(null);
  const simulationErrorRef = useRef<SimulationError | null>(null);
  const celebrationShownRef = useRef(false);

  // Monaco editor ref for line highlighting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Grid auto-sizing
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
      const maxTileW = (width - padding) / config.grid.width;
      const maxTileH = (height - padding) / config.grid.height;
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
  }, [config.grid.width, config.grid.height]);

  // Reset playback when config changes
  useEffect(() => {
    setActions([]);
    setCurrentActionIndex(0);
    setBotState(config.bot_start);
    setGrid(config.grid);
    setError(null);
    setIsPlaying(false);
    setStarsMet(config.star_objectives.map(() => false));
    setPuzzleCompleted(false);
    setShowCelebration(false);
    celebrationShownRef.current = false;
  }, [config.grid, config.bot_start, config.star_objectives]);

  // Playback interval
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
        if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      };
    } else if (currentActionIndex >= actions.length && isPlaying) {
      setIsPlaying(false);
    }
  }, [isPlaying, actions.length, speed, currentActionIndex]);

  // Replay actions
  useEffect(() => {
    if (actions.length === 0) return;

    const newBotState: BotState = { ...config.bot_start, message: null };
    const newGrid = JSON.parse(JSON.stringify(config.grid)) as Grid;

    for (let i = 0; i < currentActionIndex; i++) {
      const action = actions[i];
      if (action) {
        if (action.action.type === "error") {
          setIsPlaying(false);
          setError(
            simulationErrorRef.current ?? {
              line: null,
              column: null,
              message: action.action.message,
              friendly_hint: null,
            },
          );
          break;
        }
        newBotState.message = null;
        applyAction(action.action, newBotState, newGrid);
      }
    }

    setBotState(newBotState);
    setGrid(newGrid);

    // Show celebration when playback finishes and puzzle is completed
    if (currentActionIndex === actions.length && actions.length > 0) {
      if (puzzleCompleted && !celebrationShownRef.current) {
        celebrationShownRef.current = true;
        setShowCelebration(true);
      }
    }
  }, [currentActionIndex, actions, config.bot_start, config.grid, puzzleCompleted]);

  const handleRunCode = useCallback((autoPlay = true) => {
    setIsRunning(true);
    setError(null);
    setActions([]);
    setCurrentActionIndex(0);
    setBotState(config.bot_start);
    setGrid(config.grid);
    setStarsMet(config.star_objectives.map(() => false));
    setPuzzleCompleted(false);
    setShowCelebration(false);
    celebrationShownRef.current = false;
    simulationErrorRef.current = null;

    try {
      const result = runSimulationWithConfig(config, code);

      setActions(result.actions);
      setStarsMet(result.stars_met);
      setPuzzleCompleted(result.puzzle_completed);
      simulationErrorRef.current = result.error ?? null;

      if (result.actions.length === 0 && result.error) {
        setError(result.error);
      }

      if (result.actions.length > 0) {
        setCurrentActionIndex(autoPlay ? 0 : 1);
        setBotState(config.bot_start);
        setGrid(config.grid);
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
  }, [config, code]);

  const handleSetStarterCode = () => {
    onConfigChange({ ...config, starter_code: code });
  };

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // Highlight the current line in the editor during playback
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

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
    <div className="relative flex flex-col lg:flex-row gap-4 h-full min-h-0">
      {/* Left Panel: Objectives + Grid + Controls */}
      <div className="flex flex-col lg:w-1/2 min-h-0">
        <div className="shrink-0">
          <PuzzleObjectivePanel
            title={config.title}
            description={config.description}
            completion={config.completion}
            starObjectives={config.star_objectives}
            starsMet={starsMet}
            puzzleCompleted={puzzleCompleted}
            goalContext={{
              botState,
              grid,
              instructions: code.split("\n").length,
              steps: currentActionIndex,
            }}
          />
        </div>

        <div
          ref={gridContainerRef}
          className={`flex-1 min-h-0 flex justify-center ${gridOverflows ? "overflow-auto items-start py-2" : "items-center"}`}
        >
          <GameGrid grid={grid} botState={botState} tileSize={tileSize} />
        </div>

        <div className="shrink-0 pt-2">
          <PlaybackControls
            isPlaying={isPlaying}
            onPlay={() => {
              if (actions.length === 0) {
                handleRunCode(true);
              } else {
                setIsPlaying(true);
              }
            }}
            onPause={() => setIsPlaying(false)}
            onStep={() => {
              if (actions.length === 0) {
                handleRunCode(false);
                return;
              }
              if (currentActionIndex < actions.length) setCurrentActionIndex((p) => p + 1);
            }}
            onReset={() => {
              setIsPlaying(false);
              setCurrentActionIndex(0);
              setBotState(config.bot_start);
              setGrid(config.grid);
            }}
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
      </div>

      {/* Right Panel: Code Editor + Run */}
      <div className="flex flex-col lg:w-1/2 min-h-0">
        <div className="flex-1 min-h-[200px] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700/40">
          <Editor
            height="100%"
            language="nybl"
            theme={colorMode === "dark" ? "vs-dark" : "vs"}
            value={code}
            onChange={(val) => onCodeChange(val ?? "")}
            beforeMount={registerNyblLanguage}
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
                  <p className="text-amber-300 text-xs mt-1">{error.friendly_hint}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="shrink-0 pt-2 flex gap-2">
          <Button
            onClick={() => handleRunCode()}
            disabled={isRunning}
            className="flex-1 h-12 text-base font-bold"
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
          <Button
            onClick={handleSetStarterCode}
            variant="secondary"
            className="h-12 text-sm"
            title="Set current code as the puzzle's starter code"
          >
            <Code className="h-4 w-4 mr-1.5" />
            Set as Starter
          </Button>
        </div>
      </div>

      {/* Celebration Overlay */}
      <CelebrationOverlay
        isVisible={showCelebration}
        onRepeatLevel={() => setShowCelebration(false)}
        repeatLabel="Keep Testing"
        hasNextPuzzle={false}
        starsMet={[puzzleCompleted, ...starsMet]}
      />
    </div>
  );
}
