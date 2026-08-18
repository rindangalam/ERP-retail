import { LabaRugiClient } from "./laba-rugi-client";
import { getIncomeStatement } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function LabaRugiPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const to = sp.to || new Date().toISOString().slice(0, 10);
  const from = sp.from || `${new Date().getFullYear()}-01-01`;
  const data = await getIncomeStatement(from, to);
  return <LabaRugiClient data={data} />;
}
