import { NeracaClient } from "./neraca-client";
import { getBalanceSheet } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function NeracaPage({
  searchParams,
}: {
  searchParams: Promise<{ as_of?: string }>;
}) {
  const sp = await searchParams;
  const asOf = sp.as_of || new Date().toISOString().slice(0, 10);
  const data = await getBalanceSheet(asOf);
  return <NeracaClient data={data} />;
}
