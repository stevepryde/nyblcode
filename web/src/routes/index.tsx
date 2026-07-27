import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Star, Pencil, Upload, X } from "lucide-react";
import { useMemo, useState, useRef } from "react";
import { getWorlds, getWorldLevels } from "@/lib/wasm";
import { getProgress } from "@/lib/progress";
import { importConfigFromJson } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { ColorModeToggle } from "@/components/ui/color-mode-toggle";
import { NyblIcon } from "@/components/ui/nybl-icon";
import { WORLD_THEME_CLASS } from "@/lib/theme";
import type { WorldInfo } from "@/types/game";

export const Route = createFileRoute("/")({
    component: HomePage,
});

function HomePage() {
    const navigate = useNavigate();
    const worlds = useMemo(() => getWorlds(), []);
    const progress = useMemo(() => getProgress(), []);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const worldLevelCounts = useMemo(() => {
        const counts: Record<string, string[]> = {};
        for (const w of worlds) {
            counts[w.world_id] = getWorldLevels(w.world_id).map((l) => l.puzzle_id);
        }
        return counts;
    }, [worlds]);

    function worldProgress(world: WorldInfo) {
        const levelIds = worldLevelCounts[world.world_id] ?? [];
        const total = levelIds.length;
        if (total === 0) return { completed: 0, total, stars: 0, maxStars: 0 };

        let completed = 0;
        let stars = 0;
        for (const levelId of levelIds) {
            const lp = progress.levels[levelId];
            if (lp?.completed) {
                completed++;
                stars += lp.stars;
            }
        }

        return { completed, total, stars, maxStars: total * 3 };
    }

    const handleCustomFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const config = await importConfigFromJson(file);
            sessionStorage.setItem("nyblcode_custom_play", JSON.stringify(config));
            setShowCustomModal(false);
            navigate({ to: "/play/custom" });
        } catch (err) {
            setImportError(err instanceof Error ? err.message : "Failed to load file");
        }
        e.target.value = "";
    };

    return (
        <div className="min-h-screen w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white flex flex-col">
            {/* Header */}
            <header className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-2">
                    <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-indigo-400">
                        <NyblIcon className="h-6 w-6" />
                        nyblcode
                    </h1>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => setShowCustomModal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-700/60 border border-zinc-300 dark:border-zinc-700 rounded-lg transition-colors cursor-pointer"
                        >
                            <Upload className="h-4 w-4" />
                            Play Custom Level
                        </button>
                        <button
                            onClick={() => navigate({ to: "/editor" })}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-700/60 border border-zinc-300 dark:border-zinc-700 rounded-lg transition-colors cursor-pointer"
                        >
                            <Pencil className="h-4 w-4" />
                            Level Editor
                        </button>
                        <ColorModeToggle />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
                {/* Hero */}
                <div className="mb-12">
                    <h2 className="text-3xl font-bold mb-3">
                        Learn to code by solving puzzles
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-2xl">
                        Nybl is a small language designed to introduce you to programming with
                        real code. You'll learn the fundamentals of programming and start
                        to think like a software developer. No coding experience required.
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-2xl mt-4">
                        Everything runs entirely in your browser. There are no requests
                        to other servers, no tracking, no ads, and it's completely free.
                    </p>
                </div>

                {/* Worlds Grid */}
                <section>
                    <h3 className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
                        Worlds
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {worlds.map((world) => {
                            const wp = worldProgress(world);
                            const themeColors: Record<string, string> = {
                                grassy_plains: "from-teal-400/80 to-teal-700",
                                crystal_caves: "from-cyan-400/80 to-cyan-700",
                                abandoned_station: "from-amber-300/80 to-amber-600",
                                volcanic_islands: "from-orange-400/80 to-orange-700",
                                cloud_city: "from-indigo-400/80 to-indigo-700",
                            };
                            const color =
                                themeColors[world.theme] ?? "from-indigo-400/80 to-indigo-700";
                            const themeClass = WORLD_THEME_CLASS[world.theme] ?? "";

                            return (
                                <button
                                    key={world.world_id}
                                    onClick={() =>
                                        navigate({
                                            to: "/play/$worldId",
                                            params: { worldId: world.world_id },
                                        })
                                    }
                                    className={`${themeClass} group relative overflow-hidden rounded-xl bg-linear-to-br ${color} p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer flex flex-col`}
                                >
                                    <h4 className="text-lg font-bold text-(--theme-contrast) mb-1">
                                        {world.title}
                                    </h4>
                                    <p className="text-sm text-(--theme-contrast)/70 leading-relaxed">
                                        {world.description}
                                    </p>

                                    {wp.total > 0 && (
                                        <div className="mt-auto pt-4 space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-black/20 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-(--theme-contrast)/40 rounded-full transition-all"
                                                        style={{
                                                            width: `${Math.min(100, (wp.completed / wp.total) * 100)}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs text-(--theme-contrast)/60 font-medium">
                                                    {wp.completed}/{wp.total}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Star className={`h-3 w-3 ${wp.stars > 0 ? "text-yellow-300 fill-yellow-300" : "text-(--theme-contrast)/30"}`} />
                                                <span className="text-xs text-(--theme-contrast)/60 font-medium">
                                                    {wp.stars}/{wp.maxStars}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-zinc-200 dark:border-zinc-800">
                <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-zinc-400 dark:text-zinc-500">
                    <p>&copy; {new Date().getFullYear()} Inspired Journeys Studio</p>
                    <div className="flex items-center gap-4">
                        <a
                            href="/privacy"
                            className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <a
                            href="/terms"
                            className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                        >
                            Terms of Service
                        </a>
                        <a
                            href="https://github.com/stevepryde/nyblcode"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                        >
                            GitHub
                        </a>
                    </div>
                </div>
            </footer>

            {/* Play Custom Level Modal */}
            {showCustomModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl relative">
                        <button
                            onClick={() => { setShowCustomModal(false); setImportError(null); }}
                            className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Play Custom Level</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                            Upload a puzzle JSON file created with the Level Editor. The puzzle will open in the same play view as built-in levels.
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">
                            You can create and export custom levels from the Level Editor using the Download button.
                        </p>

                        {importError && (
                            <div className="mb-4 text-sm text-red-300 bg-red-900/30 border border-red-400/30 rounded-md px-3 py-2">
                                {importError}
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleCustomFileSelect}
                            className="hidden"
                        />
                        <Button
                            onClick={() => { setImportError(null); fileInputRef.current?.click(); }}
                            className="w-full"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose JSON File
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
