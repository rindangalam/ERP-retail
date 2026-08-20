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

function readStored(): Appearance {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Appearance>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

const AppearanceContext = React.createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = React.useState<Appearance>(readStored);
  const [systemDark, setSystemDark] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved = appearance.theme === "system" ? (systemDark ? "dark" : "light") : appearance.theme;

  React.useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = resolved;
    el.dataset.density = appearance.density;
    el.dataset.accent = appearance.accent;
    el.style.colorScheme = resolved;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
    } catch {}
  }, [resolved, appearance]);

  const value = React.useMemo<AppearanceContextValue>(
    () => ({
      ...appearance,
      setTheme: (theme) => setAppearance((a) => ({ ...a, theme })),
      setDensity: (density) => setAppearance((a) => ({ ...a, density })),
      setAccent: (accent) => setAppearance((a) => ({ ...a, accent })),
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