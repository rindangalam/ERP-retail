"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { ArrowDown, ArrowUp, CornerDownLeft, Search } from "lucide-react";
import type { MenuItem } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { iconFor } from "@/lib/menu-icons";

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 items-center rounded-sm border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground",
        className
      )}
    >
      {children}
    </kbd>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
  menu,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: MenuItem[];
}) {
  const router = useRouter();
  const items = React.useMemo(() => menu.filter((m) => !m.comingSoon), [menu]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const select = (item: MenuItem) => {
    onOpenChange(false);
    router.push(item.href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="absolute inset-0 bg-black/20 supports-backdrop-filter:backdrop-blur-xs"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute top-[18vh] left-1/2 w-[min(560px,calc(100vw-2rem))]">
        <div className="animate-[dialog-pop_0.22s_cubic-bezier(0.34,1.56,0.64,1)_both] -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-float">
          <Command
            onKeyDown={(e) => {
              if (e.key === "Escape") onOpenChange(false);
            }}
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                autoFocus
                placeholder="Cari menu..."
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <Kbd>esc</Kbd>
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-1.5">
              <Command.Empty className="px-2 py-10 text-center text-sm text-muted-foreground">
                Tidak ada hasil
              </Command.Empty>
              <Command.Group
                heading="Navigasi"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {items.map((item) => {
                  const Icon = iconFor(item.href);
                  return (
                    <Command.Item
                      key={item.href}
                      value={item.title}
                      onSelect={() => select(item)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{item.title}</span>
                      <CornerDownLeft className="size-3.5 text-muted-foreground/50" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </Command.List>
            <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Kbd>
                  <ArrowUp className="size-2.5" />
                  <ArrowDown className="size-2.5" />
                </Kbd>
                Navigasi
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>↵</Kbd>
                Pilih
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <Kbd>⌘K</Kbd>
                Buka
              </span>
            </div>
          </Command>
        </div>
      </div>
    </div>
  );
}