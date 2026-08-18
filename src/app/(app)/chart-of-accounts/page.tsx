import { ChartOfAccountsClient } from "./chart-of-accounts-client";
import { listCOA } from "@/lib/coa";

export const dynamic = "force-dynamic";

export default async function ChartOfAccountsPage() {
  const data = await listCOA();
  return <ChartOfAccountsClient initialData={data} />;
}
