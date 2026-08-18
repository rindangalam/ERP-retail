import { SalesReturnsClient } from "./sales-returns-client";
import { listSalesReturns } from "@/lib/sales-return";

export const dynamic = "force-dynamic";

export default async function SalesReturnsPage() {
  const data = await listSalesReturns();
  return <SalesReturnsClient initialData={data} />;
}
