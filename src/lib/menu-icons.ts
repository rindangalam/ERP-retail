import {
  ArrowLeftRight,
  BookOpen,
  Boxes,
  Briefcase,
  Calculator,
  ClipboardList,
  FileText,
  IdCard,
  Landmark,
  LayoutDashboard,
  NotebookPen,
  PackageCheck,
  Receipt,
  RotateCcw,
  Scale,
  ShoppingCart,
  Store,
  Tags,
  TrendingUp,
  Truck,
  Undo2,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const ICON_BY_HREF: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/users": Users,
  "/products": Boxes,
  "/categories": Tags,
  "/stock-opname": ClipboardList,
  "/suppliers": Truck,
  "/purchasing": ShoppingCart,
  "/goods-receipts": PackageCheck,
  "/purchase-returns": Undo2,
  "/customers": UserRound,
  "/sales-orders": FileText,
  "/sales-invoices": Receipt,
  "/sales-returns": RotateCcw,
  "/chart-of-accounts": BookOpen,
  "/journal-entries": NotebookPen,
  "/cash-bank": Landmark,
  "/reports/neraca": Scale,
  "/reports/laba-rugi": TrendingUp,
  "/reports/arus-kas": ArrowLeftRight,
  "/employees": Briefcase,
  "/payroll": Wallet,
  "/sales": Store,
  "/finance": Calculator,
  "/hr": IdCard,
};

export function iconFor(href: string): LucideIcon {
  const key = Object.keys(ICON_BY_HREF)
    .filter((k) => href === k || href.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];
  return (key && ICON_BY_HREF[key]) || FileText;
}

const GROUP_BY_PREFIX: { prefix: string; group: string }[] = [
  { prefix: "/reports", group: "Laporan" },
  { prefix: "/chart-of-accounts", group: "Keuangan" },
  { prefix: "/journal-entries", group: "Keuangan" },
  { prefix: "/cash-bank", group: "Keuangan" },
  { prefix: "/employees", group: "SDM" },
  { prefix: "/payroll", group: "SDM" },
  { prefix: "/users", group: "Administrasi" },
];

export function groupFor(href: string): string {
  return GROUP_BY_PREFIX.find((g) => href.startsWith(g.prefix))?.group ?? "Operasional";
}