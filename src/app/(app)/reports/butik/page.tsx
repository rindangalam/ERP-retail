import { requireRole } from "@/lib/dal";
import {
  getBestSellers,
  getLowStockVariants,
  getMargin,
  getTodayOmzet,
} from "@/lib/boutique-reports";
import { ButikClient } from "./butik-client";

export const dynamic = "force-dynamic";

export default async function ButikPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["admin", "sales"]);

  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const to = sp.to || today;
  const from = sp.from || `${to.slice(0, 7)}-01`;

  const [omzet, bestSellers, lowStock, margin] = await Promise.all([
    getTodayOmzet(today),
    getBestSellers(from, to, 10),
    getLowStockVariants(),
    getMargin(from, to),
  ]);

  return (
    <ButikClient
      today={today}
      omzet={omzet}
      bestSellers={bestSellers}
      lowStock={lowStock}
      margin={margin}
    />
  );
}
