import { notFound } from "next/navigation";
import { getCashBankAccount, listTransactions, getBalance } from "@/lib/cash-bank";
import { CashBankDetailClient } from "./cash-bank-detail-client";

export const dynamic = "force-dynamic";

export default async function CashBankDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getCashBankAccount(id);
  if (!account) notFound();

  const transactions = await listTransactions(id);
  const balance = await getBalance(id);

  return <CashBankDetailClient account={account} transactions={transactions} balance={balance} />;
}
