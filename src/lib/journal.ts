import "server-only";
import { Query } from "node-appwrite";
import { adminDatabases } from "./appwrite-server";

const DATABASE_ID = "erp";

export type JournalEntry = {
  $id: string;
  entry_number: string;
  entry_date: string;
  source_type: string;
  source_id: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: string;
  reversed_by_entry_id: string | null;
  reversed_at: string | null;
  created_by: string;
  created_at: string;
};

export type JournalEntryLine = {
  $id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string;
};

export type JournalEntryWithLines = JournalEntry & {
  lines: (JournalEntryLine & { account_code?: string; account_name?: string })[];
};

export type COAAccount = {
  $id: string;
  code: string;
  name: string;
};

export async function listJournalEntries(opts?: {
  sourceType?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}): Promise<JournalEntry[]> {
  const db = adminDatabases();
  const queries = [
    Query.orderDesc("entry_date"),
    Query.limit(opts?.limit ?? 200),
  ];
  if (opts?.sourceType) {
    queries.push(Query.equal("source_type", [opts.sourceType]));
  }
  if (opts?.fromDate) {
    queries.push(Query.greaterThanEqual("entry_date", opts.fromDate));
  }
  if (opts?.toDate) {
    queries.push(Query.lessThanEqual("entry_date", opts.toDate));
  }
  const result = await db.listDocuments(DATABASE_ID, "journal_entries", queries);
  return result.documents.map((d) => ({ ...d })) as unknown as JournalEntry[];
}

export async function getJournalEntry(id: string): Promise<JournalEntryWithLines | null> {
  try {
    const db = adminDatabases();
    const entry = (await db.getDocument(
      DATABASE_ID, "journal_entries", id
    )) as unknown as JournalEntry;
    const linesResult = await db.listDocuments(DATABASE_ID, "journal_entry_lines", [
      Query.equal("journal_entry_id", [id]),
    ]);

    const accountIds = [...new Set(linesResult.documents.map((l: Record<string, unknown>) => l.account_id as string))];
    let accounts: COAAccount[] = [];
    if (accountIds.length > 0) {
      const acctsResult = await db.listDocuments(DATABASE_ID, "chart_of_accounts", [
        Query.limit(100),
      ]);
      accounts = acctsResult.documents as unknown as COAAccount[];
    }
    const acctMap = new Map(accounts.map((a) => [a.$id, a]));

    const lines = linesResult.documents.map((l: Record<string, unknown>) => {
      const acct = acctMap.get(l.account_id as string);
      return {
        ...l,
        account_code: acct?.code ?? "?",
        account_name: acct?.name ?? "Unknown",
      };
    }) as JournalEntryWithLines["lines"];

    return { ...entry, lines };
  } catch {
    return null;
  }
}
