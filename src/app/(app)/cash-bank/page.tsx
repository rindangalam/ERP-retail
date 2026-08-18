import { CashBankClient } from "./cash-bank-client";
import { listCashBankAccounts } from "@/lib/cash-bank";

export const dynamic = "force-dynamic";

export default async function CashBankPage() {
  const data = await listCashBankAccounts();
  return <CashBankClient initialData={data} />;
}
