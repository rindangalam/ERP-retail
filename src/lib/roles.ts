export const ROLES = [
  "admin",
  "warehouse",
  "purchasing",
  "sales",
  "finance",
  "hr",
] as const;

export type Role = (typeof ROLES)[number];

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  warehouse: "Gudang",
  purchasing: "Purchasing",
  sales: "Sales",
  finance: "Finance",
  hr: "HR & Payroll",
};

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

export type MenuItem = {
  title: string;
  href: string;
  roles: Role[];
  icon: LucideIcon;
  comingSoon?: boolean;
};

export const MENU_ITEMS: MenuItem[] = [
  { title: "Dashboard", href: "/dashboard", roles: [...ROLES], icon: LayoutDashboard },
  { title: "Pengguna", href: "/users", roles: ["admin"], icon: Users },
  { title: "Produk", href: "/products", roles: ["admin", "warehouse"], icon: Boxes },
  { title: "Kategori", href: "/categories", roles: ["admin", "warehouse"], icon: Tags },
  { title: "Stock Opname", href: "/stock-opname", roles: ["admin", "warehouse"], icon: ClipboardList },
  { title: "Supplier", href: "/suppliers", roles: ["admin", "purchasing"], icon: Truck },
  { title: "Purchasing", href: "/purchasing", roles: ["admin", "purchasing"], icon: ShoppingCart },
  { title: "Goods Receipt", href: "/goods-receipts", roles: ["admin", "warehouse"], icon: PackageCheck },
  { title: "Purchase Return", href: "/purchase-returns", roles: ["admin", "purchasing", "finance"], icon: Undo2 },
  { title: "Customer", href: "/customers", roles: ["admin", "sales"], icon: UserRound },
  { title: "Sales Order", href: "/sales-orders", roles: ["admin", "sales"], icon: FileText },
  { title: "Sales Invoice", href: "/sales-invoices", roles: ["admin", "sales", "finance"], icon: Receipt },
  { title: "Sales Return", href: "/sales-returns", roles: ["admin", "sales", "finance"], icon: RotateCcw },
  { title: "Chart of Accounts", href: "/chart-of-accounts", roles: ["admin", "finance"], icon: BookOpen },
  { title: "Jurnal Umum", href: "/journal-entries", roles: ["admin", "finance"], icon: NotebookPen },
  { title: "Kas & Bank", href: "/cash-bank", roles: ["admin", "finance"], icon: Landmark },
  { title: "Neraca", href: "/reports/neraca", roles: ["admin", "finance"], icon: Scale },
  { title: "Laba Rugi", href: "/reports/laba-rugi", roles: ["admin", "finance"], icon: TrendingUp },
  { title: "Arus Kas", href: "/reports/arus-kas", roles: ["admin", "finance"], icon: ArrowLeftRight },
  { title: "Karyawan", href: "/employees", roles: ["admin", "hr", "finance"], icon: Briefcase },
  { title: "Payroll", href: "/payroll", roles: ["admin", "hr", "finance"], icon: Wallet },
  { title: "Sales", href: "/sales", roles: ["admin", "sales"], icon: Store, comingSoon: true },
  { title: "Finance", href: "/finance", roles: ["admin", "finance"], icon: Calculator, comingSoon: true },
  { title: "HR & Payroll", href: "/hr", roles: ["admin", "hr"], icon: IdCard, comingSoon: true },
];

export function getMenuForRole(role: string): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.roles.includes(role as Role));
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
