import { ArusKasClient } from "./arus-kas-client";
import { getCashFlowStatement } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function ArusKasPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const to = sp.to || new Date().toISOString().slice(0, 10);
  const from = sp.from || `${new Date().getFullYear()}-01-01`;
  const data = await getCashFlowStatement(from, to);
  return <ArusKasClient data={data} />;
}
