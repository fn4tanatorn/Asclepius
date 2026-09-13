"use client";

import { useSyncExternalStore } from "react";
import { IconMonitor, IconMoon, IconSun } from "./icons";
import { THEME_STORAGE_KEY } from "./theme-script";

type Choice = "system" | "light" | "dark";
const NEXT: Record<Choice, Choice> = {
  system: "light",
  light: "dark",
  dark: "system",
};
const LABEL: Record<Choice, string> = {
  system: "ตามระบบ",
  light: "โหมดสว่าง",
  dark: "โหมดมืด",
};
const listeners = new Set<() => void>();

/** Reads the current choice from localStorage. Browser-only. */
function getSnapshot(): Choice {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

/**
 * Matches the server's render (no localStorage there) and the client's very
 * first hydration pass, so switching to the real saved choice right after
 * never causes a hydration mismatch.
 */
function getServerSnapshot(): Choice {
  return "system";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setChoice(choice: Choice) {
  const root = document.documentElement;
  try {
    if (choice === "system") {
      root.removeAttribute("data-theme");
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      root.setAttribute("data-theme", choice);
      localStorage.setItem(THEME_STORAGE_KEY, choice);
    }
  } catch {
    /* storage unavailable (private browsing, etc.) — attribute still applies for this load */
  }
  listeners.forEach((l) => l());
}

/**
 * Cycles ตามระบบ → โหมดสว่าง → โหมดมืด → ตามระบบ on click, so the OS
 * preference (which used to force dark mode on visitors whose system was
 * set to dark) is only the default, never the final word.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const choice = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const Icon =
    choice === "system" ? IconMonitor : choice === "light" ? IconSun : IconMoon;

  return (
    <button
      type="button"
      onClick={() => setChoice(NEXT[choice])}
      aria-label={`ธีม: ${LABEL[choice]} กดเพื่อเปลี่ยน`}
      title={`ธีม: ${LABEL[choice]} (กดเพื่อเปลี่ยน)`}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition hover:bg-surface-2 hover:text-ink ${className}`}
    >
      <Icon width={18} height={18} />
    </button>
  );
}
