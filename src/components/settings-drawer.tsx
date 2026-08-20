"use client";

import * as React from "react";
import { Monitor, Moon, Palette, Sun, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAppearance, type Accent, type Theme } from "@/components/appearance-provider";

const themeOptions: { value: Theme; label: string; icon: LucideIcon; description: string }[] = [
  { value: "system", label: "Sistem", icon: Monitor, description: "Ikuti pengaturan perangkat" },
  { value: "light", label: "Terang", icon: Sun, description: "Selalu mode terang" },
  { value: "dark", label: "Gelap", icon: Moon, description: "Selalu mode gelap" },
];

const accents: { value: Accent; label: string; swatch: string }[] = [
  { value: "emerald", label: "Emerald", swatch: "bg-[oklch(0.58_0.14_160)]" },
  { value: "blue", label: "Biru", swatch: "bg-[oklch(0.52_0.18_255)]" },
  { value: "violet", label: "Ungu", swatch: "bg-[oklch(0.55_0.22_290)]" },
  { value: "amber", label: "Amber", swatch: "bg-[oklch(0.60_0.15_75)]" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export function SettingsDrawer() {
  const { theme, setTheme, accent, setAccent, density, setDensity } = useAppearance();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Pengaturan tampilan"
        onClick={() => setOpen(true)}
      >
        <Palette />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="gap-6 p-0 sm:max-w-sm">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="flex items-center gap-2">
              <Palette className="size-4 text-brand" />
              Pengaturan Tampilan
            </SheetTitle>
            <SheetDescription>Personalisasi tema sesuai preferensimu.</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-5 pb-6">
            <div className="space-y-2.5">
              <SectionLabel>Tema</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((opt) => {
                  const active = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition-colors",
                        active
                          ? "border-brand/40 bg-brand/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/60"
                      )}
                    >
                      <opt.icon className={cn("size-4", active && "text-brand")} />
                      <span className="text-[11px] font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {
                  themeOptions.find((o) => o.value === theme)?.description
                }
              </p>
            </div>

            <div className="space-y-2.5">
              <SectionLabel>Warna aksen</SectionLabel>
              <div className="flex gap-2.5">
                {accents.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    aria-label={opt.label}
                    onClick={() => setAccent(opt.value)}
                    className={cn(
                      "size-8 rounded-full transition-transform hover:scale-110",
                      opt.swatch,
                      accent === opt.value &&
                        "ring-2 ring-ring ring-offset-2 ring-offset-background"
                    )}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Aksen dipakai untuk sidebar, tombol, dan grafik.
              </p>
            </div>

            <div className="space-y-2.5">
              <SectionLabel>Kerapatan</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "comfortable", label: "Lega", description: "Spasi lebih longgar" },
                    { value: "compact", label: "Padat", description: "Lebih banyak data" },
                  ] as const
                ).map((opt) => {
                  const active = density === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDensity(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center transition-colors",
                        active
                          ? "border-brand/40 bg-brand/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/60"
                      )}
                    >
                      <span className="text-[11px] font-medium">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground">{opt.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}