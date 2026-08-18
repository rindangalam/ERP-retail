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

export type MenuItem = {
  title: string;
  href: string;
  roles: Role[];
  comingSoon?: boolean;
};

export const MENU_ITEMS: MenuItem[] = [
  { title: "Dashboard", href: "/dashboard", roles: [...ROLES] },
  { title: "Pengguna", href: "/users", roles: ["admin"] },
  { title: "Produk", href: "/products", roles: ["admin", "warehouse"] },
  { title: "Kategori", href: "/categories", roles: ["admin", "warehouse"] },
  { title: "Stock Opname", href: "/stock-opname", roles: ["admin", "warehouse"] },
  { title: "Supplier", href: "/suppliers", roles: ["admin", "purchasing"] },
  { title: "Purchasing", href: "/purchasing", roles: ["admin", "purchasing"] },
  { title: "Goods Receipt", href: "/goods-receipts", roles: ["admin", "warehouse"] },
  { title: "Purchase Return", href: "/purchase-returns", roles: ["admin", "purchasing", "finance"] },
  { title: "Customer", href: "/customers", roles: ["admin", "sales"] },
  { title: "Sales Order", href: "/sales-orders", roles: ["admin", "sales"] },
  { title: "Sales Invoice", href: "/sales-invoices", roles: ["admin", "sales", "finance"] },
  { title: "Sales Return", href: "/sales-returns", roles: ["admin", "sales", "finance"] },
  { title: "Chart of Accounts", href: "/chart-of-accounts", roles: ["admin", "finance"] },
  { title: "Jurnal Umum", href: "/journal-entries", roles: ["admin", "finance"] },
  { title: "Kas & Bank", href: "/cash-bank", roles: ["admin", "finance"] },
  { title: "Neraca", href: "/reports/neraca", roles: ["admin", "finance"] },
  { title: "Laba Rugi", href: "/reports/laba-rugi", roles: ["admin", "finance"] },
  { title: "Arus Kas", href: "/reports/arus-kas", roles: ["admin", "finance"] },
  { title: "Sales", href: "/sales", roles: ["admin", "sales"], comingSoon: true },
  { title: "Finance", href: "/finance", roles: ["admin", "finance"], comingSoon: true },
  { title: "HR & Payroll", href: "/hr", roles: ["admin", "hr"], comingSoon: true },
];

export function getMenuForRole(role: string): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.roles.includes(role as Role));
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
