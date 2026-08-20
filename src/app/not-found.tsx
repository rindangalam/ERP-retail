import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
          <Compass className="size-5 text-muted-foreground/70" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-semibold tracking-tight">404 — Halaman tidak ditemukan</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Alamat yang kamu tuju tidak ada atau sudah dipindahkan.
          </p>
        </div>
        <Link href="/dashboard">
          <Button>Kembali ke Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}