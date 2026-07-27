import { useCallback, useState } from "react";
import Editor from "@monaco-editor/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { registerNyblLanguage } from "@/lib/monaco-nybl";
import { useColorMode } from "@/lib/theme";
import type { PuzzleConfig, PuzzleObjective, TileType, WorldTheme } from "@/types/game";

interface ConfigTabProps {
    config: PuzzleConfig;
    onConfigChange: (config: PuzzleConfig) => void;
}

type ObjectiveId = "reach_position" | "collect_all_gems" | "deposit_all_gems" | "deposit_all_diamonds";

const OBJECTIVE_OPTIONS: { id: ObjectiveId; label: string; locked?: boolean }[] = [
    { id: "reach_position", label: "Reach the goal tile", locked: true },
    { id: "collect_all_gems", label: "Collect all gems" },
    { id: "deposit_all_gems", label: "Deposit all gems" },
    { id: "deposit_all_diamonds", label: "Deposit all diamonds" },
];

const THEME_OPTIONS: { id: WorldTheme; label: string; gradient: string }[] = [
    { id: "grassy_plains", label: "Grassy Plains", gradient: "from-teal-400 to-teal-600" },
    { id: "crystal_caves", label: "Crystal Caves", gradient: "from-cyan-400 to-cyan-600" },
    { id: "abandoned_station", label: "Abandoned Station", gradient: "from-amber-300 to-amber-500" },
    { id: "volcanic_islands", label: "Volcanic Islands", gradient: "from-orange-400 to-orange-600" },
    { id: "cloud_city", label: "Cloud City", gradient: "from-indigo-400 to-indigo-600" },
];

function findGoalTile(config: PuzzleConfig): { x: number; y: number } | null {
    for (let y = 0; y < config.grid.height; y++) {
        for (let x = 0; x < config.grid.width; x++) {
            if (config.grid.tiles[y]?.[x]?.tile_type === ("goal" as TileType)) {
                return { x, y };
            }
        }
    }
    return null;
}

/** Flatten an "all" objective into its component IDs, or return a single-element set. */
function getActiveObjectiveIds(completion: PuzzleObjective): Set<ObjectiveId> {
    if (completion.type === "all") {
        const ids = new Set<ObjectiveId>();
        for (const c of completion.conditions) {
            ids.add(c.type as ObjectiveId);
        }
        return ids;
    }
    return new Set([completion.type as ObjectiveId]);
}

/** Build a PuzzleObjective from a set of checked IDs. reach_position is always included. */
function buildCompletion(ids: Set<ObjectiveId>, config: PuzzleConfig): PuzzleObjective {
    // Always include reach_position
    ids.add("reach_position");

    const objectives: PuzzleObjective[] = [];
    for (const id of ids) {
        switch (id) {
            case "reach_position": {
                const goal = findGoalTile(config);
                objectives.push({ type: "reach_position", x: goal?.x ?? config.grid.width - 1, y: goal?.y ?? config.grid.height - 1 });
                break;
            }
            case "collect_all_gems":
                objectives.push({ type: "collect_all_gems" });
                break;
            case "deposit_all_gems":
                objectives.push({ type: "deposit_all_gems" });
                break;
            case "deposit_all_diamonds":
                objectives.push({ type: "deposit_all_diamonds" });
                break;
        }
    }

    if (objectives.length === 1) return objectives[0]!;
    return { type: "all", conditions: objectives };
}

export function ConfigTab({ config, onConfigChange }: ConfigTabProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const colorMode = useColorMode();
    const monacoTheme = colorMode === "dark" ? "vs-dark" : "vs";

    const update = useCallback(
        (partial: Partial<PuzzleConfig>) => {
            onConfigChange({ ...config, ...partial });
        },
        [config, onConfigChange],
    );

    // Objectives as checkboxes
    const activeIds = getActiveObjectiveIds(config.completion);
    // Ensure reach_position is always shown as active
    activeIds.add("reach_position");

    const handleObjectiveToggle = (id: ObjectiveId, checked: boolean) => {
        if (id === "reach_position") return; // locked
        const next = new Set(activeIds);
        if (checked) {
            next.add(id);
        } else {
            next.delete(id);
        }
        update({ completion: buildCompletion(next, config) });
    };

    // Star objectives
    const maxInstr =
        config.star_objectives.find(
            (o): o is PuzzleObjective & { type: "max_instructions" } => o.type === "max_instructions",
        )?.instructions ?? 0;

    const maxSteps =
        config.star_objectives.find(
            (o): o is PuzzleObjective & { type: "max_steps" } => o.type === "max_steps",
        )?.steps ?? 0;

    const handleStarChange = (instrVal: number, stepsVal: number) => {
        const stars: PuzzleObjective[] = [];
        if (instrVal > 0) stars.push({ type: "max_instructions", instructions: instrVal });
        if (stepsVal > 0) stars.push({ type: "max_steps", steps: stepsVal });
        update({ star_objectives: stars });
    };

    const currentTheme = config.theme ?? "grassy_plains";

    return (
        <div className="flex flex-col gap-5 h-full overflow-auto p-1">
            {/* Title */}
            <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                    Title
                </label>
                <input
                    type="text"
                    value={config.title}
                    onChange={(e) => update({ title: e.target.value })}
                    className="w-full h-9 px-3 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:border-[var(--theme-400)] focus:outline-none"
                    placeholder="Puzzle title"
                />
            </div>

            {/* Description */}
            <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                    Description
                </label>
                <textarea
                    value={config.description}
                    onChange={(e) => update({ description: e.target.value })}
                    className="w-full h-20 px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white resize-none focus:border-[var(--theme-400)] focus:outline-none"
                    placeholder="Describe the puzzle..."
                />
            </div>

            {/* Theme */}
            <div>
                <div className="flex items-baseline gap-2 mb-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        Theme
                    </label>
                    <span className="text-xs text-zinc-500">Sets the color scheme for the level</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {THEME_OPTIONS.map(({ id, label, gradient }) => {
                        const isSelected = currentTheme === id;
                        return (
                            <button
                                key={id}
                                onClick={() => update({ theme: id })}
                                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${isSelected
                                        ? "border-zinc-400 dark:border-white/50 ring-1 ring-zinc-300 dark:ring-white/30 bg-zinc-100 dark:bg-zinc-800"
                                        : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500"
                                    }`}
                            >
                                <span className={`w-4 h-4 rounded-sm bg-gradient-to-br ${gradient} shrink-0`} />
                                <span className={isSelected ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"}>
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Completion Objectives — checkboxes */}
            <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                    Completion Objectives
                </label>
                <div className="space-y-2">
                    {OBJECTIVE_OPTIONS.map(({ id, label, locked }) => {
                        const checked = activeIds.has(id);
                        return (
                            <label
                                key={id}
                                className={`flex items-center gap-2.5 group ${locked ? "cursor-default" : "cursor-pointer"}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={locked}
                                    onChange={(e) => handleObjectiveToggle(id, e.target.checked)}
                                    className="h-4 w-4 rounded border-zinc-400 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-[var(--theme-400)] focus:ring-[var(--theme-400)] focus:ring-offset-0 accent-[var(--theme-500)] disabled:opacity-60 disabled:cursor-default cursor-pointer"
                                />
                                <span className={`text-sm ${checked ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"} ${locked ? "opacity-60" : ""}`}>
                                    {label}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Star Objectives */}
            <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                    Star Objectives
                </label>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-zinc-400">Max instructions:</label>
                        <input
                            type="number"
                            min={0}
                            value={maxInstr}
                            onChange={(e) => handleStarChange(Number(e.target.value), maxSteps)}
                            className="w-16 h-7 text-xs text-center bg-zinc-800 border border-zinc-700 rounded text-white"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-zinc-400">Max steps:</label>
                        <input
                            type="number"
                            min={0}
                            value={maxSteps}
                            onChange={(e) => handleStarChange(maxInstr, Number(e.target.value))}
                            className="w-16 h-7 text-xs text-center bg-zinc-800 border border-zinc-700 rounded text-white"
                        />
                    </div>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Set to 0 for no star objective</p>
            </div>

            {/* Advanced — collapsible */}
            <div className="border-t border-zinc-800 pt-3">
                <button
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide hover:text-zinc-300 transition-colors cursor-pointer"
                >
                    {showAdvanced ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                    Advanced
                </button>

                {showAdvanced && (
                    <div className="flex flex-col gap-5 mt-4">
                        {/* Starter Code */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                                Starter Code
                            </label>
                            <div className="h-32 rounded-md overflow-hidden border border-zinc-300 dark:border-zinc-700">
                                <Editor
                                    height="100%"
                                    language="nybl"
                                    theme={monacoTheme}
                                    value={config.starter_code}
                                    onChange={(val) => update({ starter_code: val ?? "" })}
                                    beforeMount={registerNyblLanguage}
                                    options={{
                                        minimap: { enabled: false },
                                        lineNumbers: "on",
                                        wordWrap: "on",
                                        fontSize: 13,
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Hint */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                                Hint
                            </label>
                            <input
                                type="text"
                                value={config.hint ?? ""}
                                onChange={(e) => update({ hint: e.target.value || null })}
                                className="w-full h-9 px-3 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:border-[var(--theme-400)] focus:outline-none"
                                placeholder="Optional hint shown on error"
                            />
                        </div>

                        {/* Tutorial */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                                Tutorial (Markdown)
                            </label>
                            <div className="h-32 rounded-md overflow-hidden border border-zinc-300 dark:border-zinc-700">
                                <Editor
                                    height="100%"
                                    language="markdown"
                                    theme={monacoTheme}
                                    value={config.tutorial ?? ""}
                                    onChange={(val) => update({ tutorial: val || null })}
                                    options={{
                                        minimap: { enabled: false },
                                        lineNumbers: "off",
                                        wordWrap: "on",
                                        fontSize: 13,
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
