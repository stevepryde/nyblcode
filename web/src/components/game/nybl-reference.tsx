import { useId, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface NyblReferenceProps {
  variant?: "game" | "language";
}

export function NyblReference({ variant = "game" }: NyblReferenceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const languageOnly = variant === "language";
  const contentId = useId();

  return (
    <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
        >
          Nybl 0.4 Language Reference
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
        <a
          href="https://nybl-lang.com/docs/"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 px-4 py-2 text-xs text-[var(--theme-700)] dark:text-[var(--theme-400)] hover:text-[var(--theme-600)] dark:hover:text-[var(--theme-300)] hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
        >
          Full Docs
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {isOpen && (
        <div
          id={contentId}
          className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm overflow-y-auto max-h-[40vh]"
        >
          {!languageOnly && (
            <>
              {/* Movement */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Movement
                </h3>
                <dl className="space-y-1">
                  <Fn name='move(dir)' desc='dir: "forward" "backward" "up" "down" "left" "right"' />
                  <Fn name='turn("left")' desc="Rotate bot (left/right)" />
                  <Fn name="wait(n)" desc="Wait n ticks" />
                </dl>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Items
                </h3>
                <dl className="space-y-1">
                  <Fn name="grab()" desc="Pick up item at current tile" />
                  <Fn name="drop()" desc="Deposit/drop item on current tile" />
                  <Fn name="has_gem()" desc="True if holding a gem" />
                  <Fn name="has_key()" desc="True if holding a key" />
                  <Fn name="has_diamond()" desc="True if holding a diamond" />
                  <Fn name="inventory()" desc='Dict: {"gems", "diamonds", "keys"}' />
                  <Fn name='inventory_count("type")' desc="Count of held items by type" />
                </dl>
              </div>

              {/* Sensing */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Sensing
                </h3>
                <dl className="space-y-1">
                  <Fn name='look(dir)' desc="Tile/item name ahead" />
                  <Fn name="wall_ahead()" desc="True if wall ahead" />
                  <Fn name="path_ahead()" desc="True if can move ahead" />
                  <Fn name="gem_ahead()" desc="True if gem ahead" />
                  <Fn name="gem_here()" desc="True if gem on current tile" />
                  <Fn name="key_ahead()" desc="True if key ahead" />
                  <Fn name="key_here()" desc="True if key on current tile" />
                  <Fn name="diamond_ahead()" desc="True if diamond ahead" />
                  <Fn name="diamond_here()" desc="True if diamond here" />
                  <Fn name="pit_ahead()" desc="True if pit ahead" />
                  <Fn name="tile_type()" desc="Type of current tile" />
                  <Fn name="position()" desc="[x, y] of bot" />
                  <Fn name='facing()' desc='"up", "down", "left", or "right"' />
                  <Fn name="grid_size()" desc="[width, height] of grid" />
                </dl>
              </div>
            </>
          )}

          {/* Language */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              Language
            </h3>
            <dl className="space-y-1">
              <Fn name="let x = 5" desc="Declare a variable" />
              <Fn name="const LIMIT = 10" desc="Declare a constant" />
              <Fn name="if / else" desc="Conditional branching" />
              <Fn name="while cond { }" desc="Loop while true" />
              <Fn name="for x in list { }" desc="Loop over items" />
              <Fn name="repeat 3 { }" desc="Loop n times" />
              <Fn name="fn name(a) { }" desc="Define a function" />
              <Fn name="fn change(ref x) { }" desc="Update a caller variable" />
              <Fn name="match value { }" desc="Match values and enum variants" />
              {languageOnly ? (
                <Fn name='print("hi")' desc="Write a line to output" />
              ) : (
                <>
                  <Fn name="use std.math" desc="Load a standard-library module" />
                  <Fn name='say("hi")' desc="Display a message" />
                </>
              )}
              <Fn name="range(n)" desc="[0, 1, ..., n-1]" />
            </dl>
          </div>

          {languageOnly && (
            <>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Values &amp; Collections
                </h3>
                <dl className="space-y-1">
                  <Fn name='[1, 2, 3]' desc="Array literal" />
                  <Fn name='{"key": value}' desc="Dictionary literal" />
                  <Fn name='"hello {name}"' desc="String interpolation" />
                  <Fn name="len(value)" desc="Length of a string or collection" />
                  <Fn name="value[index]" desc="Read an array, string, or dictionary item" />
                  <Fn name="true / false / none" desc="Boolean and empty values" />
                </dl>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Standard Library
                </h3>
                <dl className="space-y-1">
                  <Fn name="use std.math" desc="Constants and numeric helpers" />
                  <Fn name="use std.iter" desc="Map, filter, reduce, sum, and find" />
                  <Fn name="use std.string" desc="String helpers" />
                  <Fn name="use std.collections" desc="Set, Queue, and Stack" />
                  <Fn name="use std.json" desc="Parse and stringify JSON" />
                  <Fn name="use std.test" desc="Assertions and test helpers" />
                </dl>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Operators
                </h3>
                <dl className="space-y-1">
                  <Fn name="+ - * / %" desc="Arithmetic" />
                  <Fn name="== != &lt; &lt;= &gt; &gt;=" desc="Comparison" />
                  <Fn name="&& || !" desc="Boolean logic" />
                  <Fn name="+= -= *= /= %=" desc="Update assignment" />
                </dl>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Fn({ name, desc }: { name: string; desc: string }) {
  return (
    <div>
      <dt className="font-mono text-xs text-[var(--theme-700)] dark:text-[var(--theme-300)]">{name}</dt>
      <dd className="text-xs text-zinc-500 ml-2">{desc}</dd>
    </div>
  );
}
