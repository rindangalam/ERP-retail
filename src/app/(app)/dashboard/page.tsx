import Link from "next/link";
import { requireAuth } from "@/lib/dal";
import { listLowStockProducts } from "@/lib/inventory";
import { roleLabels } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const roleLabel = roleLabels[session.role as keyof typeof roleLabels] ?? session.role;
  const showInventoryAlerts = session.role === "admin" || session.role === "warehouse";
  const lowStock = showInventoryAlerts ? await listLowStockProducts() : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Selamat datang, {session.name}!</h1>
        <p className="text-sm text-muted-foreground">
          Anda login sebagai <span className="font-medium text-foreground">{roleLabel}</span>.
        </p>
      </div>

      {showInventoryAlerts ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Stok Menipis</CardTitle>
              <CardDescription>
                Produk aktif dengan stok di bawah batas minimum.
              </CardDescription>
            </div>
            {lowStock.length > 0 ? (
              <Badge variant="outline" className="text-destructive">
                {formatNumber(lowStock.length)} produk
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Semua stok di atas batas minimum.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead className="text-right">Stok</TableHead>
                      <TableHead className="text-right">Minimum</TableHead>
                      <TableHead className="text-right">Kekurangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStock.map((product) => {
                      const current = Number(product.current_stock);
                      const min = Number(product.min_stock);
                      const deficit = min - current;
                      return (
                        <TableRow key={product.$id}>
                          <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-right">
                            <span className={current <= 0 ? "text-destructive font-medium" : ""}>
                              {formatNumber(current)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(min)}</TableCell>
                          <TableCell className="text-right text-destructive">
                            -{formatNumber(deficit)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/products">Kelola produk</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Modul sesuai peran</CardTitle>
          <CardDescription>
            Modul akan muncul di menu samping sesuai role Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Purchasing, Sales, Finance, dan HR & Payroll menyusul di sprint berikutnya.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
