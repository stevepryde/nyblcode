import Editor from "@monaco-editor/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Play } from "lucide-react";
import { useState } from "react";
import { NyblReference } from "@/components/game/nybl-reference";
import { Button } from "@/components/ui/button";
import { ColorModeToggle } from "@/components/ui/color-mode-toggle";
import { NyblIcon } from "@/components/ui/nybl-icon";
import { registerNyblLanguage } from "@/lib/monaco-nybl";
import { useColorMode } from "@/lib/theme";
import { runPlayground } from "@/lib/wasm";
import type { PlaygroundResult } from "@/types/game";

export const Route = createFileRoute("/playground")({
  component: PlaygroundPage,
});

const STARTER_CODE = `use std.math

let answer = clamp(42, 0, 10)
print("Hello from Nybl!")
print("The answer is {answer}")`;

function PlaygroundPage() {
  const navigate = useNavigate();
  const colorMode = useColorMode();
  const [code, setCode] = useState(STARTER_CODE);
  const [result, setResult] = useState<PlaygroundResult>({
    output: [],
    error: null,
  });

  const handleRun = () => {
    setResult(runPlayground(code));
  };

  const location = result.error
    ? [
        result.error.line ? `line ${result.error.line}` : null,
        result.error.column ? `column ${result.error.column}` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white flex flex-col overflow-hidden">
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
              Home
            </Button>
            <span className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-indigo-400">
              <NyblIcon className="h-4 w-4" />
              nyblcode
            </span>
          </div>
          <h1 className="text-sm font-semibold">Playground</h1>
          <ColorModeToggle />
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          <section className="flex-1 min-h-[240px] md:min-h-0 md:w-1/2 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <Editor
              height="100%"
              language="nybl"
              theme={colorMode === "dark" ? "vs-dark" : "vs"}
              value={code}
              onChange={(value) => setCode(value ?? "")}
              beforeMount={registerNyblLanguage}
              options={{
                minimap: { enabled: false },
                lineNumbers: "on",
                wordWrap: "on",
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16 },
              }}
            />
          </section>

          <section className="flex-1 min-h-[200px] md:min-h-0 md:w-1/2 flex flex-col bg-zinc-50 dark:bg-zinc-950">
            <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                Output
              </h2>
              <Button size="sm" onClick={handleRun}>
                <Play className="h-4 w-4" />
                Run
              </Button>
            </div>

            <div
              className="flex-1 min-h-0 overflow-auto p-4 font-mono text-sm"
              aria-live="polite"
            >
              {result.output.length === 0 && !result.error ? (
                <p className="text-zinc-400 dark:text-zinc-600">
                  Run your code to see its output.
                </p>
              ) : (
                <div className="space-y-1">
                  {result.output.map((line, index) => (
                    <div key={index} className="whitespace-pre-wrap break-words">
                      {line || " "}
                    </div>
                  ))}
                </div>
              )}

              {result.error && (
                <div className="mt-4 rounded-lg border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-950/40 p-3 font-sans">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        {location && <span className="capitalize">{location}: </span>}
                        {result.error.message}
                      </p>
                      {result.error.friendly_hint && (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                          {result.error.friendly_hint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <NyblReference variant="language" />
      </main>
    </div>
  );
}
