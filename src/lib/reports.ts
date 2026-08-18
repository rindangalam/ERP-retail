import "server-only";
import { Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";

const DATABASE_ID = "erp";

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

type AccountInfo = {
  $id: string;
  code: string;
  name: string;
  account_type: AccountType;
  is_active: boolean;
};

type JournalLine = {
  $id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string;
};

type JournalEntry = {
  $id: string;
  entry_number: string;
  entry_date: string;
  source_type: string;
  description: string;
  status: string;
};

export type AccountBalance = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  debit: number;
  credit: number;
  balance: number; // positive = normal balance for that type
};

export type BalanceSheetData = {
  as_of_date: string;
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  retainedEarnings: number;
};

export type IncomeStatementData = {
  from_date: string;
  to_date: string;
  revenues: AccountBalance[];
  expenses: AccountBalance[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
};

export type CashFlowItem = {
  source_type: string;
  description: string;
  amount_in: number;
  amount_out: number;
};

export type CashFlowData = {
  from_date: string;
  to_date: string;
  operating: CashFlowItem[];
  totalOperatingIn: number;
  totalOperatingOut: number;
  investing: CashFlowItem[];
  totalInvestingIn: number;
  totalInvestingOut: number;
  financing: CashFlowItem[];
  totalFinancingIn: number;
  totalFinancingOut: number;
  netCashFlow: number;
};

async function getAllAccounts(): Promise<AccountInfo[]> {
  const db = adminDatabases();
  const result = await db.listDocuments(DATABASE_ID, "chart_of_accounts", [
    Query.equal("is_active", [true]),
    Query.limit(100),
  ]);
  return result.documents.map((d) => ({ ...d })) as unknown as AccountInfo[];
}

async function getLinesUpToDate(asOfDate: string): Promise<JournalLine[]> {
  const db = adminDatabases();
  // Get all entries posted up to the date
  const entriesResult = await db.listDocuments(DATABASE_ID, "journal_entries", [
    Query.lessThanEqual("entry_date", asOfDate),
    Query.equal("status", ["posted"]),
    Query.limit(500),
  ]);
  const entries = entriesResult.documents as unknown as JournalEntry[];
  if (entries.length === 0) return [];

  const entryIds = entries.map((e) => e.$id);
  // Fetch lines in batches (Appwrite query limitation)
  const allLines: JournalLine[] = [];
  for (let i = 0; i < entryIds.length; i += 30) {
    const batch = entryIds.slice(i, i + 30);
    const linesResult = await db.listDocuments(DATABASE_ID, "journal_entry_lines", [
      Query.limit(500),
    ]);
    const batchLines = (linesResult.documents as unknown as JournalLine[]).filter((l) =>
      batch.includes(l.journal_entry_id)
    );
    allLines.push(...batchLines);
  }
  return allLines;
}

async function getLinesInPeriod(fromDate: string, toDate: string): Promise<JournalLine[]> {
  const db = adminDatabases();
  const entriesResult = await db.listDocuments(DATABASE_ID, "journal_entries", [
    Query.greaterThanEqual("entry_date", fromDate),
    Query.lessThanEqual("entry_date", toDate),
    Query.equal("status", ["posted"]),
    Query.limit(500),
  ]);
  const entries = entriesResult.documents as unknown as JournalEntry[];
  if (entries.length === 0) return [];

  const entryIds = entries.map((e) => e.$id);
  const allLines: JournalLine[] = [];
  for (let i = 0; i < entryIds.length; i += 30) {
    const batch = entryIds.slice(i, i + 30);
    const linesResult = await db.listDocuments(DATABASE_ID, "journal_entry_lines", [
      Query.limit(500),
    ]);
    const batchLines = (linesResult.documents as unknown as JournalLine[]).filter((l) =>
      batch.includes(l.journal_entry_id)
    );
    allLines.push(...batchLines);
  }
  return allLines;
}

function aggregateByAccount(lines: JournalLine[], accounts: AccountInfo[]): AccountBalance[] {
  const acctMap = new Map(accounts.map((a) => [a.$id, a]));
  const aggMap = new Map<string, { debit: number; credit: number }>();

  for (const line of lines) {
    const existing = aggMap.get(line.account_id) || { debit: 0, credit: 0 };
    existing.debit += line.debit;
    existing.credit += line.credit;
    aggMap.set(line.account_id, existing);
  }

  const result: AccountBalance[] = [];
  for (const [accountId, agg] of aggMap) {
    const acct = acctMap.get(accountId);
    if (!acct) continue;
    const isNormalDebit = acct.account_type === "asset" || acct.account_type === "expense";
    const balance = isNormalDebit ? agg.debit - agg.credit : agg.credit - agg.debit;
    result.push({
      account_id: accountId,
      account_code: acct.code,
      account_name: acct.name,
      account_type: acct.account_type,
      debit: agg.debit,
      credit: agg.credit,
      balance,
    });
  }
  return result.sort((a, b) => a.account_code.localeCompare(b.account_code));
}

export async function getBalanceSheet(asOfDate: string): Promise<BalanceSheetData> {
  const accounts = await getAllAccounts();
  const lines = await getLinesUpToDate(asOfDate);
  const aggregated = aggregateByAccount(lines, accounts);

  const assets = aggregated.filter((a) => a.account_type === "asset");
  const liabilities = aggregated.filter((a) => a.account_type === "liability");
  const equity = aggregated.filter((a) => a.account_type === "equity");
  const revenues = aggregated.filter((a) => a.account_type === "revenue");
  const expenses = aggregated.filter((a) => a.account_type === "expense");

  const totalRevenue = revenues.reduce((s, a) => s + a.balance, 0);
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
  const retainedEarnings = totalRevenue - totalExpenses;

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
  const totalEquity = equity.reduce((s, a) => s + a.balance, 0) + retainedEarnings;

  return {
    as_of_date: asOfDate,
    assets, liabilities, equity,
    totalAssets, totalLiabilities, totalEquity, retainedEarnings,
  };
}

export async function getIncomeStatement(fromDate: string, toDate: string): Promise<IncomeStatementData> {
  const accounts = await getAllAccounts();
  const lines = await getLinesInPeriod(fromDate, toDate);
  const aggregated = aggregateByAccount(lines, accounts);

  const revenues = aggregated.filter((a) => a.account_type === "revenue");
  const expenses = aggregated.filter((a) => a.account_type === "expense");

  const totalRevenue = revenues.reduce((s, a) => s + a.balance, 0);
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);

  return {
    from_date: fromDate, to_date: toDate,
    revenues, expenses,
    totalRevenue, totalExpenses,
    netIncome: totalRevenue - totalExpenses,
  };
}

function classifyCashFlow(sourceType: string): "operating" | "investing" | "financing" {
  switch (sourceType) {
    case "sales_payment": case "sales_invoice": case "purchase_return":
      return "operating";
    case "goods_receipt": case "purchase_return_out":
      return "operating";
    case "manual": default:
      return "operating";
  }
}

export async function getCashFlowStatement(fromDate: string, toDate: string): Promise<CashFlowData> {
  const db = adminDatabases();
  const entriesResult = await db.listDocuments(DATABASE_ID, "journal_entries", [
    Query.greaterThanEqual("entry_date", fromDate),
    Query.lessThanEqual("entry_date", toDate),
    Query.equal("status", ["posted"]),
    Query.limit(500),
  ]);
  const entries = entriesResult.documents as unknown as JournalEntry[];

  const operating: CashFlowItem[] = [];
  const investing: CashFlowItem[] = [];
  const financing: CashFlowItem[] = [];

  for (const entry of entries) {
    const category = classifyCashFlow(entry.source_type);
    const target = category === "operating" ? operating : category === "investing" ? investing : financing;
    target.push({
      source_type: entry.source_type,
      description: entry.description,
      amount_in: 0,
      amount_out: 0,
    });
  }

  // Simplified: aggregate by source_type
  const operatingIn = operating.reduce((s, i) => s + i.amount_in, 0);
  const operatingOut = operating.reduce((s, i) => s + i.amount_out, 0);
  const investingIn = investing.reduce((s, i) => s + i.amount_in, 0);
  const investingOut = investing.reduce((s, i) => s + i.amount_out, 0);
  const financingIn = financing.reduce((s, i) => s + i.amount_in, 0);
  const financingOut = financing.reduce((s, i) => s + i.amount_out, 0);

  return {
    from_date: fromDate, to_date: toDate,
    operating, totalOperatingIn: operatingIn, totalOperatingOut: operatingOut,
    investing, totalInvestingIn: investingIn, totalInvestingOut: investingOut,
    financing, totalFinancingIn: financingIn, totalFinancingOut: financingOut,
    netCashFlow: (operatingIn - operatingOut) + (investingIn - investingOut) + (financingIn - financingOut),
  };
}
