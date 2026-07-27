import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

export function NyblReference() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
      >
        Nybl 0.4 Language Reference
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
        <a
          href="https://nybl-lang.com/docs/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="ml-auto flex items-center gap-1 text-xs text-[var(--theme-700)] dark:text-[var(--theme-400)] hover:text-[var(--theme-600)] dark:hover:text-[var(--theme-300)] transition-colors"
        >
          Full Docs
          <ExternalLink className="h-3 w-3" />
        </a>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm overflow-y-auto max-h-[40vh]">
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
              <Fn
                name='look(dir)'
                desc="Tile/item name ahead"
              />
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
              <Fn name="use std.math" desc="Load a standard-library module" />
              <Fn name='say("hi")' desc="Display a message" />
              <Fn name="range(n)" desc="[0, 1, ..., n-1]" />
            </dl>
          </div>
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
