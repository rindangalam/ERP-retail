"use client";

import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppearance, type Accent, type Theme } from "@/components/appearance-provider";

const themeOptions: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "system", label: "Sistem", icon: Monitor },
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
];

const accents: { value: Accent; label: string; swatch: string }[] = [
  { value: "emerald", label: "Emerald", swatch: "bg-[oklch(0.58_0.14_160)]" },
  { value: "blue", label: "Biru", swatch: "bg-[oklch(0.52_0.18_255)]" },
  { value: "violet", label: "Ungu", swatch: "bg-[oklch(0.55_0.22_290)]" },
  { value: "amber", label: "Amber", swatch: "bg-[oklch(0.60_0.15_75)]" },
];

export function AppearanceMenu() {
  const { theme, setTheme, accent, setAccent, density, setDensity } = useAppearance();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Pengaturan tampilan">
          <Palette />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <div className="flex gap-1 p-1">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
                theme === opt.value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <opt.icon className="size-3.5" />
              {opt.label}
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Aksen</DropdownMenuLabel>
        <div className="flex gap-1.5 p-1">
          {accents.map((opt) => (
            <button
              key={opt.value}
              type="button"
              title={opt.label}
              aria-label={opt.label}
              onClick={() => setAccent(opt.value)}
              className={cn(
                "size-6 rounded-full transition-transform hover:scale-110",
                opt.swatch,
                accent === opt.value && "ring-2 ring-ring ring-offset-2 ring-offset-background"
              )}
            />
          ))}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Kerapatan</DropdownMenuLabel>
        <div className="flex gap-1 p-1">
          <button
            type="button"
            onClick={() => setDensity("comfortable")}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
              density === "comfortable" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            Lega
          </button>
          <button
            type="button"
            onClick={() => setDensity("compact")}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
              density === "compact" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            Padat
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useAppearance();

  const cycle = () => {
    const order: Theme[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <Button variant="ghost" size="icon-sm" aria-label="Ganti tema" className={className} onClick={cycle}>
      <Icon />
    </Button>
  );
}