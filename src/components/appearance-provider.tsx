"use client";

import * as React from "react";

export type Theme = "system" | "light" | "dark";
export type Accent = "emerald" | "blue" | "violet" | "amber";
export type Density = "comfortable" | "compact";

type Appearance = {
  theme: Theme;
  density: Density;
  accent: Accent;
};

type AppearanceContextValue = Appearance & {
  setTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
  setAccent: (accent: Accent) => void;
};

const STORAGE_KEY = "erp-appearance";

const defaults: Appearance = { theme: "system", density: "comfortable", accent: "emerald" };

function parse(raw: string | null): Appearance {
  if (!raw) return defaults;
  try {
    return { ...defaults, ...(JSON.parse(raw) as Partial<Appearance>) };
  } catch {
    return defaults;
  }
}

// localStorage-backed store with a cached snapshot so getSnapshot returns a
// stable object identity between renders (required by useSyncExternalStore).
let lastRaw: string | null = null;
let lastSnapshot: Appearance = defaults;

function getSnapshot(): Appearance {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {}
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastSnapshot = parse(raw);
  }
  return lastSnapshot;
}

function getServerSnapshot(): Appearance {
  return defaults;
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function writeAppearance(next: Appearance): void {
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {}
  lastRaw = raw;
  lastSnapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribeSystemDark(callback: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSystemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getSystemDarkServer(): boolean {
  return false;
}

const AppearanceContext = React.createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const appearance = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const systemDark = React.useSyncExternalStore(subscribeSystemDark, getSystemDark, getSystemDarkServer);

  const resolved = appearance.theme === "system" ? (systemDark ? "dark" : "light") : appearance.theme;

  React.useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = resolved;
    el.dataset.density = appearance.density;
    el.dataset.accent = appearance.accent;
    el.style.colorScheme = resolved;
  }, [resolved, appearance]);

  const value = React.useMemo<AppearanceContextValue>(
    () => ({
      ...appearance,
      setTheme: (theme) => writeAppearance({ ...getSnapshot(), theme }),
      setDensity: (density) => writeAppearance({ ...getSnapshot(), density }),
      setAccent: (accent) => writeAppearance({ ...getSnapshot(), accent }),
    }),
    [appearance]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = React.useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used within AppearanceProvider");
  return ctx;
}
