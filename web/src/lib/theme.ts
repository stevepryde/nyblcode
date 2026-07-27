import { useSyncExternalStore } from "react";
import type { WorldTheme } from "@/types/game";

/** Maps a world theme identifier to the CSS class that sets --theme-* custom properties. */
export const WORLD_THEME_CLASS: Record<WorldTheme, string> = {
  grassy_plains: "theme-teal",
  crystal_caves: "theme-cyan",
  abandoned_station: "theme-amber",
  volcanic_islands: "theme-orange",
  cloud_city: "theme-indigo",
};

// ---------------------------------------------------------------------------
// Color mode (dark / light)
// ---------------------------------------------------------------------------

const STORAGE_KEY = "nyblcode_color_mode";

export type ColorMode = "dark" | "light";

let currentMode: ColorMode = "dark";
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function getColorMode(): ColorMode {
  return currentMode;
}

export function setColorMode(mode: ColorMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  currentMode = mode;
  applyColorMode(mode, true);
  notify();
}

/** React hook — re-renders the component when color mode changes. */
export function useColorMode(): ColorMode {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentMode,
  );
}

function applyColorMode(mode: ColorMode, animate = false) {
  const root = document.documentElement;

  if (animate) {
    root.classList.add("color-mode-transition");
  }

  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  if (animate) {
    // Remove after transitions complete
    setTimeout(() => root.classList.remove("color-mode-transition"), 350);
  }
}

/**
 * Call once before React renders. Reads persisted preference and applies the
 * `dark` class to `<html>` synchronously so there's no flash.
 */
export function initColorMode() {
  const stored = localStorage.getItem(STORAGE_KEY);
  currentMode = stored === "light" ? "light" : "dark";
  applyColorMode(currentMode);
}
