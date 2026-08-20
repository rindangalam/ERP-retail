"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Search } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { logoutAction } from "@/app/(auth)/login/actions";
import { getMenuForRole, roleLabels } from "@/lib/roles";
import { PageTransition } from "@/components/page-transition";
import { SettingsDrawer } from "@/components/settings-drawer";
import { CommandPalette } from "@/components/command-palette";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { AppsMegamenu } from "@/components/apps-megamenu";
import type { AppNotification } from "@/lib/notifications";

type AppShellProps = {
  userName: string;
  userRole: string;
  notifications: AppNotification[];
  children: React.ReactNode;
};

export function AppShell({ userName, userRole, notifications, children }: AppShellProps) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const reduce = useReducedMotion();

  const menu = getMenuForRole(userRole);
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand font-mono text-xs font-semibold text-brand-foreground shadow-card">
              E
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold tracking-tight">ERP Retail</span>
              <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{roleLabels[userRole as keyof typeof roleLabels] ?? userRole}</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarMenu>
              {menu.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                if (item.comingSoon) {
                  return (
                    <SidebarMenuItem key={item.href}>
<SidebarMenuButton disabled aria-disabled>
                      <item.icon className="size-4 shrink-0 opacity-60" aria-hidden />
                      <span>{item.title}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        Segera
                      </Badge>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="relative data-[active=true]:bg-transparent data-[active=true]:shadow-none"
                    >
                      <Link href={item.href}>
                        <item.icon className="relative size-4 shrink-0" aria-hidden />
                        {active &&
                          (reduce ? (
                            <span
                              aria-hidden
                              className="absolute inset-0 rounded-md bg-brand/10"
                            />
                          ) : (
                            <motion.span
                              layoutId="sidebar-active-pill"
                              aria-hidden
                              className="absolute inset-0 rounded-md bg-brand/10 ring-1 ring-brand/10"
                              transition={{ type: "spring", stiffness: 520, damping: 42 }}
                            />
                          ))}
                        <span className="relative truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-gradient-to-br from-brand/25 to-brand/5 font-semibold text-brand">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {userRole}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="w-48">
                  <DropdownMenuLabel>
                    <div className="text-sm font-semibold">{userName}</div>
                    <div className="text-xs text-muted-foreground">{userRole}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive"
                    disabled={pending}
                    onClick={() => {
                      setPending(true);
                      void logoutAction();
                    }}
                  >
                    {pending ? "Keluar..." : "Keluar"}
                  </Button>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Langsung ke konten
        </a>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {roleLabels[userRole as keyof typeof roleLabels] ?? userRole}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setPaletteOpen(true)}
            >
              <Search className="size-4" />
              <span className="hidden text-xs md:inline">Cari...</span>
              <kbd className="hidden rounded-sm border border-border bg-muted px-1 font-mono text-[10px] md:inline-flex">
                ⌘K
              </kbd>
            </Button>
            <AppsMegamenu menu={menu} />
            <NotificationDropdown notifications={notifications} />
            <SettingsDrawer />
          </div>
        </header>
        <main id="main-content" className="flex-1 p-4 md:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </SidebarInset>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        menu={menu}
      />
    </SidebarProvider>
  );
}
