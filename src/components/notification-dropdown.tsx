"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, PackageCheck, Receipt, TriangleAlert, FileClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppNotification, NotificationKind } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  "po-approval": FileClock,
  "po-receipt": PackageCheck,
  "invoice-unpaid": Receipt,
  "stock-low": TriangleAlert,
};

const TINTS: Record<NotificationKind, string> = {
  "po-approval": "bg-brand/10 text-brand",
  "po-receipt": "bg-positive/10 text-positive",
  "invoice-unpaid": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "stock-low": "bg-destructive/10 text-destructive",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}

export function NotificationDropdown({ notifications }: { notifications: AppNotification[] }) {
  const count = notifications.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Notifikasi (${count})`} className="relative">
          <Bell />
          {count > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px]">
              {count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-2.5">
          <span className="text-sm font-semibold">Notifikasi</span>
          {count > 0 && <Badge variant="secondary">{count} baru</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto p-1.5">
          {count === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              Tidak ada notifikasi baru
            </p>
          ) : (
            notifications.map((n) => {
              const Icon = ICONS[n.kind];
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  className="flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring outline-none"
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TINTS[n.kind])}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{n.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{n.description}</span>
                    <span className="block text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
                  </span>
                </Link>
              );
            })
          )}
        </div>
        {count > 0 && (
          <>
            <DropdownMenuSeparator />
            <p className="px-4 py-2 text-center text-[11px] text-muted-foreground">
              {count} hal perlu perhatian
            </p>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}