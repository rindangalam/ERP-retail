"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MenuItem } from "@/lib/roles";
import { groupFor, iconFor } from "@/lib/menu-icons";

export function AppsMegamenu({ menu }: { menu: MenuItem[] }) {
  const router = useRouter();
  const items = menu.filter((m) => !m.comingSoon);
  const groups = React.useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const group = groupFor(item.href);
      map.set(group, [...(map.get(group) ?? []), item]);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Modul aplikasi">
          <LayoutGrid />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[26rem] p-0">
        <DropdownMenuLabel className="px-4 py-2.5">
          <span className="text-sm font-semibold">Modul Aplikasi</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto p-2">
          {groups.map(([group, groupItems], gi) => (
            <React.Fragment key={group}>
              {gi > 0 && <div className="mx-2 my-1.5 h-px bg-border" />}
              <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              <div className="grid grid-cols-3 gap-1">
                {groupItems.map((item) => {
                  const Icon = iconFor(item.href);
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-center transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring outline-none"
                    >
                      <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                        <Icon className="size-4" />
                      </span>
                      <span className="text-[11px] font-medium leading-tight">{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}