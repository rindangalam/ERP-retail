"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Product } from "@/lib/inventory";
import type { Opname, OpnameItem } from "@/lib/opname";
import {
  addOpnameItemAction,
  cancelOpnameAction,
  createOpnameAction,
  deleteOpnameItemAction,
  postOpnameAction,
  updateOpnameAction,
  updateOpnameItemAction,
  type OpnameActionState,
} from "./actions";

type Props = {
  opnames: Opname[];
  items: OpnameItem[];
  products: Product[];
};

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID");
}

function StatusBadge({ status }: { status: Opname["status"] }) {
  if (status === "posted") {
    return (
      <Badge variant="outline" className="text-emerald-600">Posted</Badge>
    );
  }
  if (status === "cancelled") {
    return (
      <Badge variant="outline" className="text-destructive">Batal</Badge>
    );
  }
  return (
    <Badge variant="secondary">Draft</Badge>
  );
}

function TodayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function StockOpnameClient({ opnames, items, products }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const itemsByOpname = useMemo(() => {
    const map = new Map<string, OpnameItem[]>();
    for (const item of items) {
      const list = map.get(item.stock_opname_id) ?? [];
      list.push(item);
      map.set(item.stock_opname_id, list);
    }
    return map;
  }, [items]);

  const selected = selectedId ? opnames.find((o) => o.$id === selectedId) ?? null : null;

  if (selected) {
    return (
      <OpnameDetail
        opname={selected}
        items={itemsByOpname.get(selected.$id) ?? []}
        products={products}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <OpnameList opnames={opnames} itemsByOpname={itemsByOpname} onOpen={setSelectedId} />
  );
}

function OpnameList({
  opnames,
  itemsByOpname,
  onOpen,
}: {
  opnames: Opname[];
  itemsByOpname: Map<string, OpnameItem[]>;
  onOpen: (id: string) => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createOpnameAction, undefined);
  const submitted = useRef(false);

  useEffect(() => {
    if (state?.ok && state.data && !submitted.current) {
      submitted.current = true;
      router.refresh();
      onOpen(state.data.id);
      const timer = setTimeout(() => {
        submitted.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state, router, onOpen]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock Opname</h1>
          <p className="text-sm text-muted-foreground">
            Catat hasil hitung fisik dan bandingkan dengan stok sistem.
          </p>
        </div>
      </div>

      <form action={formAction} className="rounded-md border p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="opname_date">Tanggal opname</Label>
            <Input
              id="opname_date"
              name="opname_date"
              type="date"
              defaultValue={TodayInput()}
              required
            />
          </div>
          <div className="space-y-2 flex-1 min-w-52">
            <Label htmlFor="note">Catatan</Label>
            <Input id="note" name="note" placeholder="Opsional" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Membuat..." : "Buat Opname"}
          </Button>
        </div>
        {state?.errors?.opname_date ? (
          <p role="alert" className="text-sm text-destructive">{state.errors.opname_date}</p>
        ) : null}
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Item</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead className="w-40">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opnames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Belum ada opname. Buat opname baru untuk memulai.
                </TableCell>
              </TableRow>
            ) : (
              opnames.map((opname) => {
                const opnameItems = itemsByOpname.get(opname.$id) ?? [];
                const totalDiff = opnameItems.reduce((sum, i) => sum + Number(i.difference), 0);
                return (
                  <TableRow key={opname.$id}>
                    <TableCell className="font-mono text-xs">{opname.opname_number}</TableCell>
                    <TableCell>{formatDate(opname.opname_date)}</TableCell>
                    <TableCell><StatusBadge status={opname.status} /></TableCell>
                    <TableCell className="text-right">{opnameItems.length}</TableCell>
                    <TableCell className={`text-right ${totalDiff < 0 ? "text-destructive" : totalDiff > 0 ? "text-emerald-600" : ""}`}>
                      {totalDiff > 0 ? "+" : ""}{formatNumber(totalDiff)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => onOpen(opname.$id)}>
                        Buka
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OpnameDetail({
  opname,
  items,
  products,
  onBack,
}: {
  opname: Opname;
  items: OpnameItem[];
  products: Product[];
  onBack: () => void;
}) {
  const isDraft = opname.status === "draft";
  const router = useRouter();
  const [confirmPost, setConfirmPost] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const productById = useMemo(() => new Map(products.map((p) => [p.$id, p])), [products]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>← Daftar</Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{opname.opname_number}</h1>
            <p className="text-sm text-muted-foreground">
              Dibuat {formatDateTime(opname.created_at)} · {formatDate(opname.opname_date)}
              {opname.posted_at ? ` · Diposting ${formatDateTime(opname.posted_at)}` : ""}
            </p>
          </div>
        </div>
        <StatusBadge status={opname.status} />
      </div>

      {isDraft ? (
        <HeaderForm opname={opname} />
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead className="text-right">Stok Sistem</TableHead>
              <TableHead className="text-right">Qty Aktual</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead>Catatan</TableHead>
              {isDraft ? <TableHead className="w-40">Aksi</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isDraft ? 6 : 5} className="h-24 text-center text-muted-foreground">
                  Belum ada item. Tambahkan produk hasil hitung fisik.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const product = productById.get(item.product_id);
                return (
                  <ItemRow
                    key={item.$id}
                    item={item}
                    productLabel={product ? `${product.sku} — ${product.name}` : item.product_id}
                    isDraft={isDraft}
                    editing={editingItemId === item.$id}
                    onEdit={() => setEditingItemId(item.$id)}
                    onClose={() => setEditingItemId(null)}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {isDraft ? <AddItemForm opnameId={opname.$id} products={products} items={items} /> : null}

      {isDraft ? (
        <div className="flex items-center gap-3">
          {confirmPost ? (
            <PostForm opnameId={opname.$id} onDone={() => { setConfirmPost(false); router.refresh(); }} />
          ) : (
            <Button onClick={() => setConfirmPost(true)}>Posting Opname</Button>
          )}
          {confirmCancel ? (
            <form
              action={cancelOpnameAction}
              onSubmit={() => {
                setConfirmCancel(false);
                router.refresh();
              }}
            >
              <input type="hidden" name="id" value={opname.$id} />
              <Button variant="outline" type="submit">Yakin batalkan?</Button>
              <Button variant="ghost" type="button" onClick={() => setConfirmCancel(false)}>Tidak</Button>
            </form>
          ) : (
            <Button variant="outline" onClick={() => setConfirmCancel(true)}>Batalkan Opname</Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function HeaderForm({ opname }: { opname: Opname }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateOpnameAction, undefined);
  const submitted = useRef(false);

  useEffect(() => {
    if (state?.ok && !submitted.current) {
      submitted.current = true;
      router.refresh();
      const timer = setTimeout(() => {
        submitted.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="rounded-md border p-4 space-y-4">
      <input type="hidden" name="id" value={opname.$id} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="opname_date">Tanggal opname</Label>
          <Input id="opname_date" name="opname_date" type="date" defaultValue={opname.opname_date} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="note">Catatan</Label>
          <Input id="note" name="note" defaultValue={opname.note ?? ""} placeholder="Opsional" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan Perubahan"}</Button>
      </div>
    </form>
  );
}

function AddItemForm({
  opnameId,
  products,
  items,
}: {
  opnameId: string;
  products: Product[];
  items: OpnameItem[];
}) {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [actualQty, setActualQty] = useState("");
  const [state, formAction, pending] = useActionState(addOpnameItemAction, undefined);
  const submitted = useRef(false);

  const usedProductIds = new Set(items.map((i) => i.product_id));
  const available = products.filter((p) => p.is_active && !usedProductIds.has(p.$id));
  const selectedProduct = products.find((p) => p.$id === selectedProductId);
  const systemQty = selectedProduct?.current_stock ?? 0;
  const parsedActual = Number(actualQty);
  const difference = Number.isFinite(parsedActual) ? parsedActual - systemQty : NaN;

  useEffect(() => {
    if (state?.ok && !submitted.current) {
      submitted.current = true;
      router.refresh();
      setSelectedProductId("");
      setActualQty("");
      const timer = setTimeout(() => {
        submitted.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="rounded-md border p-4 space-y-4">
      <input type="hidden" name="stock_opname_id" value={opnameId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2 min-w-56 flex-1">
          <Label htmlFor="product_id">Produk</Label>
          <select
            id="product_id"
            name="product_id"
            className={SELECT_CLASS}
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            required
          >
            <option value="" disabled>Pilih produk</option>
            {available.map((p) => (
              <option key={p.$id} value={p.$id}>
                {p.sku} — {p.name} (stok {formatNumber(p.current_stock)})
              </option>
            ))}
          </select>
          {state?.errors?.product_id ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.product_id}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="actual_qty">Qty aktual</Label>
          <Input
            id="actual_qty"
            name="actual_qty"
            type="number"
            min="0"
            step="0.01"
            value={actualQty}
            onChange={(e) => setActualQty(e.target.value)}
            placeholder="0"
            required
          />
          {state?.errors?.actual_qty ? (
            <p role="alert" className="text-sm text-destructive">{state.errors.actual_qty}</p>
          ) : null}
        </div>
        <div className="space-y-2 min-w-40 flex-1">
          <Label htmlFor="item_note">Catatan</Label>
          <Input id="item_note" name="note" placeholder="Opsional" />
        </div>
        <Button type="submit" disabled={pending || available.length === 0}>
          {pending ? "Menambah..." : "Tambah Item"}
        </Button>
      </div>
      {selectedProduct ? (
        <p className="text-sm text-muted-foreground">
          Stok sistem: <span className="font-medium">{formatNumber(systemQty)}</span>
          {" · "}Selisih:{" "}
          <span className={`font-medium ${difference < 0 ? "text-destructive" : difference > 0 ? "text-emerald-600" : ""}`}>
            {Number.isFinite(difference) ? (difference > 0 ? "+" : "") + formatNumber(difference) : "—"}
          </span>
        </p>
      ) : null}
      {state?.message && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}

function ItemRow({
  item,
  productLabel,
  isDraft,
  editing,
  onEdit,
  onClose,
}: {
  item: OpnameItem;
  productLabel: string;
  isDraft: boolean;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const difference = Number(item.difference);

  if (editing) {
    return (
      <TableRow>
        <TableCell colSpan={isDraft ? 6 : 5}>
          <ItemEditForm item={item} onDone={onClose} />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{productLabel}</TableCell>
      <TableCell className="text-right">{formatNumber(Number(item.system_qty))}</TableCell>
      <TableCell className="text-right">{formatNumber(Number(item.actual_qty))}</TableCell>
      <TableCell className={`text-right ${difference < 0 ? "text-destructive" : difference > 0 ? "text-emerald-600" : ""}`}>
        {difference > 0 ? "+" : ""}{formatNumber(difference)}
      </TableCell>
      <TableCell className="text-muted-foreground">{item.note ?? "—"}</TableCell>
      {isDraft ? (
        <TableCell>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
            <form
              action={deleteOpnameItemAction}
              onSubmit={() => router.refresh()}
            >
              <input type="hidden" name="id" value={item.$id} />
              <Button variant="ghost" size="sm" className="text-destructive" type="submit">
                Hapus
              </Button>
            </form>
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function ItemEditForm({ item, onDone }: { item: OpnameItem; onDone: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateOpnameItemAction, undefined);
  const submitted = useRef(false);

  useEffect(() => {
    if (state?.ok && !submitted.current) {
      submitted.current = true;
      router.refresh();
      onDone();
      const timer = setTimeout(() => {
        submitted.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state, router, onDone]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={item.$id} />
      <div className="space-y-2">
        <Label htmlFor="actual_qty">Qty aktual</Label>
        <Input
          id="actual_qty"
          name="actual_qty"
          type="number"
          min="0"
          step="0.01"
          defaultValue={Number(item.actual_qty)}
          required
        />
      </div>
      <div className="space-y-2 min-w-40 flex-1">
        <Label htmlFor="note">Catatan</Label>
        <Input id="note" name="note" defaultValue={item.note ?? ""} placeholder="Opsional" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Button>
      <Button type="button" variant="ghost" onClick={onDone}>Batal</Button>
      {state?.errors?.actual_qty ? (
        <p role="alert" className="text-sm text-destructive">{state.errors.actual_qty}</p>
      ) : null}
    </form>
  );
}

function PostForm({ opnameId, onDone }: { opnameId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(
    (_prev: OpnameActionState, formData: FormData) => postOpnameAction(formData),
    undefined
  );
  const submitted = useRef(false);

  useEffect(() => {
    if (state?.ok && !submitted.current) {
      submitted.current = true;
      onDone();
      const timer = setTimeout(() => {
        submitted.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="id" value={opnameId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Posting..." : "Yakin posting?"}
      </Button>
      {state?.message && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}
