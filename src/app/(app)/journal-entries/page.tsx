import { JournalEntriesClient } from "./journal-entries-client";
import { listJournalEntries } from "@/lib/journal";

export const dynamic = "force-dynamic";

export default async function JournalEntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ source_type?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const data = await listJournalEntries({
    sourceType: sp.source_type,
    fromDate: sp.from,
    toDate: sp.to,
  });
  return <JournalEntriesClient initialData={data} />;
}
