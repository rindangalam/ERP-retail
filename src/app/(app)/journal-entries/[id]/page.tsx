import { notFound } from "next/navigation";
import { getJournalEntry } from "@/lib/journal";
import { sourceTypeLabel } from "@/lib/source-labels";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

export default async function JournalEntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getJournalEntry(id);
  if (!entry) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Detail Jurnal — {entry.entry_number}</h1>
        <Link href="/journal-entries" className="text-sm text-blue-600 hover:underline">
          ← Kembali
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm rounded-md border p-4 max-w-xl">
        <div>
          <span className="text-muted-foreground">No. Jurnal:</span>
          <p className="font-mono font-medium">{entry.entry_number}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Tanggal:</span>
          <p>{entry.entry_date}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Sumber:</span>
          <p><Badge variant="outline">{sourceTypeLabel(entry.source_type)}</Badge></p>
        </div>
        <div>
          <span className="text-muted-foreground">Status:</span>
          <p><Badge variant={entry.status === "posted" ? "default" : "secondary"}>{entry.status}</Badge></p>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">Keterangan:</span>
          <p>{entry.description}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Total Debit:</span>
          <p className="font-medium">{entry.total_debit.toLocaleString("id-ID")}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Total Kredit:</span>
          <p className="font-medium">{entry.total_credit.toLocaleString("id-ID")}</p>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode Akun</TableHead>
              <TableHead>Nama Akun</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right w-[130px]">Debit</TableHead>
              <TableHead className="text-right w-[130px]">Kredit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entry.lines.map((line) => (
              <TableRow key={line.$id}>
                <TableCell className="font-mono text-xs">{line.account_code}</TableCell>
                <TableCell>{line.account_name}</TableCell>
                <TableCell className="text-xs">{line.description}</TableCell>
                <TableCell className="text-right text-xs">
                  {line.debit > 0 ? line.debit.toLocaleString("id-ID") : "-"}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {line.credit > 0 ? line.credit.toLocaleString("id-ID") : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
