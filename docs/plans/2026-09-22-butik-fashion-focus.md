# Butik Fashion Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fokuskan ERP ke butik fashion single-location: varian size/warna per produk, kasir cepat (POS) tanpa Sales Order, dan laporan operasional butik.

**Architecture:** Tambah collection `product_variants` (stok per varian, Function tetap satu-satunya penulis stok); `sales_invoice_items` + `stock_movements` dapat field `product_variant_id` opsional (backward-compat: NULL = produk tanpa varian); POS = invoice langsung + post + bayar dalam satu aksi.

**Tech Stack:** Next.js App Router + TypeScript, Appwrite Database/Functions, node:test untuk Function + validasi murni.

---

## File-structure map

| Area | Files |
|---|---|
| Skema (wajib update bareng kode, CLAUDE.md #3) | Modify: `skema-database-erp.md` |
| Validasi varian (murni, testable) | Create: `src/lib/variant-validation.ts`, Test: `src/lib/variant-validation.test.mjs` |
| DAL varian | Create: `src/lib/variants.ts`, Modify: `src/app/(app)/products/actions.ts` |
| UI produk | Modify: `src/app/(app)/products/product-form.tsx`, `src/app/(app)/products/products-client.tsx` |
| Invoice + payment | Modify: `src/lib/sales-invoice-validation.ts`, `src/lib/sales-invoice.ts` |
| Function (stok varian) | Modify: `functions/postStockOpname/src/core-sales-invoice.js`, `functions/postStockOpname/src/core.js`, `functions/postStockOpname/src/index.js`, Test: `functions/postStockOpname/test/variant.test.mjs` |
| POS kasir | Create: `src/app/(app)/pos/page.tsx`, `src/app/(app)/pos/pos-client.tsx`, `src/app/(app)/pos/actions.ts` |
| Laporan butik | Create: `src/lib/boutique-reports.ts`, `src/app/(app)/reports/butik/page.tsx`, `src/app/(app)/reports/butik/butik-client.tsx` |
| Slimming menu + dashboard | Modify: `src/lib/roles.ts`, Modify: `src/lib/dashboard.ts`, `src/app/(app)/dashboard/dashboard-client.tsx` |
| Seed fashion | Create: `docs/seed-butik-fashion.md` |

## Task outline

- Task 1: Skema `product_variants` + field `product_variant_id` (dokumen dulu)
- Task 2: Validasi + DAL varian (TDD)
- Task 3: UI produk varian (form + list stok per varian)
- Task 4: Function posting sadar-varian (TDD, atomic)
- Task 5: POS kasir cepat (tanpa SO)
- Task 6: Laporan butik + slimming menu/dashboard + seed
- Task 7: Hardening + UAT butik

### Task 1: Skema varian (dokumen dulu, CLAUDE.md Eskalasi)

**Files:**
- Modify: `skema-database-erp.md` (§3.2 tambah §3.6, §1.4 + §3.3 + §5.5 tambah field)

Butik = satu model banyak size/warna. Tanpa ini stok per ukuran tidak tercatat.

- [ ] **Step 1: Tambah §3.6 `product_variants` ke skema**

```markdown
### 3.6 `product_variants` — varian size/warna (butik fashion)

| Field | Tipe | Keterangan |
|---|---|---|
| `product_id` | string | FK → `products.$id` |
| `size` | string | Misal `S` · `M` · `L` · `XL` · `All Size` |
| `color` | string | Misal `Hitam`, `Cream`; kosong = satu warna |
| `sku` | string | SKU varian, unik (contoh `BLS-001-M-HITAM`) |
| `barcode` | string | Opsional, unik bila diisi |
| `sell_price` | number | Override harga jual; NULL = ikut produk |
| `min_stock` | number | Ambang alert per varian |
| `current_stock` | number | Denormalisasi, hanya ditulis Function |
| `is_active` | boolean | |
| `created_by` / `created_at` / `updated_by` / `updated_at` | | Audit |

**Index**: `sku` (unique), `barcode` (unique), `product_id`.
**Permission**: Read: `admin`, `warehouse`, `purchasing`, `sales`, `finance`. Write: `admin`, `warehouse`.
```

- [ ] **Step 2: Tambah field varian ke tabel skema yang ada**

Di §3.3 `stock_movements` tambah baris: `product_variant_id` — string, FK opsional → `product_variants.$id`, NULL = produk tanpa varian. Di §5.5 `sales_invoice_items` tambah baris yang sama. Di §1.4 catat: `movement_type` tetap, varian dibawa di `product_variant_id`.

- [ ] **Step 3: Commit skema**

```bash
git add skema-database-erp.md
git commit -m "docs: skema product_variants untuk butik fashion"
```

### Task 2: Validasi + DAL varian (TDD)

**Files:**
- Create: `src/lib/variant-validation.ts`
- Test: `src/lib/variant-validation.test.mjs`
- Create: `src/lib/variants.ts`

Aturan: SKU varian unik global, size/color wajib minimal satu terisi, harga/stok >= 0.

- [ ] **Step 1: Tulis test gagal dulu**

Create `src/lib/variant-validation.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
test("menolak size dan color kosong bersamaan", async () => {
  const m = await import("./variant-validation.ts");
  const r = m.validateVariantInput({ product_id: "p1", size: "", color: "", sku: "X", min_stock: 0 });
  assert.equal(r.ok, false);
});
```

Run: `node --test src/lib/variant-validation.test.mjs` (Expected: FAIL, modul belum ada). Catatan: file TS diimpor langsung — jika runner gagal resolve TS, tulis logika validasi di `variant-validation.mjs` polos dan re-export dari `.ts`, bukan sebaliknya.

- [ ] **Step 2: Implementasi minimal**

Create `src/lib/variant-validation.ts`:

```ts
export type VariantInput = { product_id: string; size: string; color: string; sku: string; barcode?: string; sell_price?: number | null; min_stock: number; };
export type ValidationResult = { ok: true } | { ok: false; errors: Record<string, string> };
export function validateVariantInput(i: VariantInput): ValidationResult {
  const e: Record<string, string> = {};
  if (!i.product_id) e.product_id = "Produk wajib.";
  if (!i.size?.trim() && !i.color?.trim()) e.size = "Isi size atau warna.";
  if (!i.sku?.trim()) e.sku = "SKU varian wajib.";
  if (!Number.isFinite(i.min_stock) || i.min_stock < 0) e.min_stock = "Stok minimum >= 0.";
  if (i.sell_price != null && (!(Number.isFinite(i.sell_price)) || i.sell_price < 0)) e.sell_price = "Harga >= 0.";
  return Object.keys(e).length ? { ok: false, errors: e } : { ok: true };
}
```

- [ ] **Step 3: Verifikasi + commit**

Run: `node --test src/lib/variant-validation.test.mjs` (Expected: PASS). Lalu `git add src/lib/variant-validation.ts src/lib/variant-validation.test.mjs && git commit -m "feat: validasi varian produk butik"`.

- [ ] **Step 4: DAL `src/lib/variants.ts`**

Ikuti pola permission + `toPlain` di `src/lib/inventory.ts:50-67,154-178`. Kontrak fungsi:

```ts
import type { VariantInput } from "./variant-validation";
export type ProductVariant = { $id: string; product_id: string; size: string; color: string; sku: string; barcode: string | null; sell_price: number | null; min_stock: number; current_stock: number; is_active: boolean; created_by: string; created_at: string; };
export async function listVariants(productId: string): Promise<ProductVariant[]>;
export async function createVariant(input: VariantInput, userId: string): Promise<{ ok: true; data: ProductVariant } | { ok: false; errors: Record<string, string> }>;
export async function setVariantActive(id: string, isActive: boolean, userId: string): Promise<{ ok: boolean }>;
```

`createVariant`: validasi dulu via `validateVariantInput`, lalu cek SKU unik via `Query.equal("sku", [sku])` (tolak duplikat seperti `inventory.ts:236-255`), `current_stock` awal = 0, permission write label `admin`/`warehouse`. Jangan tulis `stock_movements` dari sini (CLAUDE.md non-negotiable #1).

### Task 3: UI produk varian (form + list stok per varian)

**Files:**
- Modify: `src/app/(app)/products/product-form.tsx`
- Modify: `src/app/(app)/products/products-client.tsx`
- Modify: `src/app/(app)/products/actions.ts`

- [ ] **Step 1: Server Action varian**

Di `actions.ts` tambah (ikuti pola `createProductAction:23-54`):

```ts
export async function createVariantAction(prev: ProductActionState, fd: FormData): Promise<ProductActionState> {
  const session = await requireRole(["admin", "warehouse"]);
  const r = await createVariant({
    product_id: String(fd.get("product_id") ?? ""),
    size: String(fd.get("size") ?? ""),
    color: String(fd.get("color") ?? ""),
    sku: String(fd.get("sku") ?? ""),
    barcode: String(fd.get("barcode") ?? ""),
    sell_price: fd.get("sell_price") ? toNumber(fd.get("sell_price")) : null,
    min_stock: toNumber(fd.get("min_stock")),
  }, session.userId);
  if (r.ok) { revalidatePath("/products"); return { ok: true, message: "Varian dibuat." }; }
  return { ok: false, errors: r.errors, message: "Gagal menyimpan varian." };
}
```

- [ ] **Step 2: Form varian di dialog produk**

Di `product-form.tsx` (mode edit): tambah section "Varian" — input size (datalist preset `XS S M L XL XXL All Size`), color (text), SKU (auto-suggest `SKUINDUK-SIZE-WARNA`, boleh edit), barcode opsional, harga override opsional, min_stock. Submit ke `createVariantAction` via `useActionState` terpisah. Aturan: produk tanpa varian tetap valid (backward-compat).

- [ ] **Step 3: Tabel + stok menipis per varian**

Di `products-client.tsx`: di bawah tiap baris produk yang punya varian, tampilkan sub-baris `SIZE · Warna · SKU · stok/min`. Stok varian read-only (ditulis Function). Test manual: buat produk `BLS-001 Blouse Linen` + varian M-Hitam, L-Cream → tersimpan, SKU duplikat ditolak.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/products" src/lib/variants.ts
git commit -m "feat: UI varian size/warna produk butik"
```

### Task 4: Function posting sadar-varian (atomic, TDD)

**Files:**
- Modify: `functions/postStockOpname/src/core-sales-invoice.js`
- Modify: `functions/postStockOpname/src/core.js`
- Modify: `functions/postStockOpname/src/index.js`
- Test: `functions/postStockOpname/test/variant.test.mjs`

Keputusan: `stock_movements.product_variant_id` nullable; update dua level — `product_variants.current_stock` dan agregat `products.current_stock`. Satu invoice gagal di satu varian = seluruh posting gagal (tidak ada setengah jalan, PRD §6).

- [ ] **Step 1: Test gagal untuk builder**

Create `functions/postStockOpname/test/variant.test.mjs` (pola `test/core.test.mjs`):

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildSalesInvoiceJournalPlan } from "../src/core-sales-invoice.js";
test("movement membawa product_variant_id", () => {
  const r = buildSalesInvoiceJournalPlan(
    { $id: "si1", invoice_number: "INV-1", total_amount: 100 },
    [{ product_id: "p1", product_variant_id: "v1", quantity: 2, _product: { current_stock: 10 } }],
    new Map([["1120", { $id: "a1" }], ["4100", { $id: "a2" }]]), "u1");
  assert.equal(r.stock_movements[0].product_variant_id, "v1");
  assert.equal(r.stock_movements[0].quantity_delta, -2);
});
```

Run: `npm test --prefix functions/postStockOpname` (Expected: FAIL).

- [ ] **Step 2: Implementasi builder**

Di `core-sales-invoice.js` `buildSalesInvoiceJournalPlan`: baca `item.product_variant_id ?? null`; tolak (`errors.items`) bila varian tidak milik produk itu atau stok varian kurang tanpa override; sertakan `product_variant_id` di tiap movement; tambah `variant_updates: [{ variant_id, delta }]`. Di `index.js`: tulis movement + update `product_variants.current_stock` + agregat induk dalam satu eksekusi; `core.js` `buildAdjustments`/GR/return diberi field yang sama (tahap ini invoice dulu, GR/opname menyusul satu pola).

- [ ] **Step 3: Verifikasi + deploy Function + commit**

Run: `npm test --prefix functions/postStockOpname` (Expected: PASS). Deploy Function, uji posting invoice 1 varian di Appwrite, cek movement + dua level stok berubah. Commit pesan `feat: posting invoice sadar-varian`.

### Task 5: POS kasir cepat (tanpa Sales Order)

**Files:**
- Create: `src/app/(app)/pos/page.tsx`
- Create: `src/app/(app)/pos/pos-client.tsx`
- Create: `src/app/(app)/pos/actions.ts`

Kasir butik: cari/scan → keranjang → bayar tunai/QRIS → selesai < 1 menit. SO tetap ada untuk admin, tapi bukan jalur default kasir.

- [ ] **Step 1: `actions.ts` — `quickSaleAction`**

Satu aksi: (1) `createSalesInvoice` dengan customer `UMUM`/member opsional + `sales_order_id` = order tunai internal (jangan wajibkan SO konfirmasi di UI; bila skema mewajibkan FK, buat SO tunai otomatis di aksi yang sama dan referensikan), (2) `postSalesInvoice`, (3) catat `sales_payments` tunai lunas. Kompensasi: bila (2) gagal → `cancelSalesInvoice`, kembalikan error jelas, jangan catat payment.

```ts
export async function quickSaleAction(input: { items: { product_id: string; product_variant_id?: string | null; quantity: number; unit_price: number }[]; payment_method: "cash" | "bank_transfer"; cash_received: number; customer_id?: string }): Promise<{ ok: true; invoice_number: string; change: number } | { ok: false; errors: Record<string, string> }> {
  // create → post → pay; on post failure: cancel invoice, return errors
}
```

Kembalian = `cash_received - total`; tolak bila kurang (kecuali transfer pas).

- [ ] **Step 2: `pos-client.tsx` — layar kasir**

Kolom kiri: search SKU/nama/barcode (termasuk SKU varian) + hasil cepat; kolom kanan: keranjang (varian, qty stepper, harga, diskon per nota) + total + tunai diterima + kembalian live + tombol Bayar. Setelah sukses: tampilkan nomor invoice + kembalian + tombol "Transaksi baru". Optimistic reset keranjang, `router.refresh()`.

- [ ] **Step 3: `page.tsx` + role**

`requireRole(["admin", "sales"])`, judul "Kasir". Test manual: jual 2 varian tunai → invoice posted, stok varian berkurang, payment tercatat, status `paid`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/pos"
git commit -m "feat: POS kasir cepat butik tanpa sales order"
```

### Task 6: Laporan butik + slimming menu/dashboard + seed

**Files:**
- Create: `src/lib/boutique-reports.ts`, `src/app/(app)/reports/butik/page.tsx`, `src/app/(app)/reports/butik/butik-client.tsx`
- Modify: `src/lib/roles.ts`, `src/lib/dashboard.ts`, `src/app/(app)/dashboard/dashboard-client.tsx`
- Create: `docs/seed-butik-fashion.md`

- [ ] **Step 1: `boutique-reports.ts` — 4 query operasional**

`getTodayOmzet(tgl)`, `getBestSellers(from, to, limit)` (agregat `sales_invoice_items` per `product_variant_id`, join nama produk + varian, skip `cancelled`), `getLowStockVariants()` (varian `current_stock < min_stock`), `getMargin(from, to)` (`(sell-cost)*qty`). Ikuti pola agregasi `src/lib/reports.ts:150-178`, tapi sumber = invoice (kasir), bukan jurnal. Hindari N+1 `reports.ts:255-261`: batch list items lalu agregat di memori.

- [ ] **Step 2: Route `/reports/butik` (roles `admin`, `sales`)**

`page.tsx` (server, `requireRole(["admin","sales"])`) + `butik-client.tsx` (kartu omzet hari ini, tabel best seller, tabel stok menipis per varian, margin periode + filter tanggal). Ini laporan operasional — sengaja boleh dibaca `sales`, tidak seperti Neraca/Laba-Rugi (`admin`,`finance`).

- [ ] **Step 3: Slimming menu `src/lib/roles.ts:57-82`**

Hapus 3 item `comingSoon` (`/sales`, `/finance`, `/hr`); tambah `{ title: "Kasir", href: "/pos", roles: ["admin", "sales"], icon: Store }` dan `{ title: "Laporan Butik", href: "/reports/butik", roles: ["admin", "sales"], icon: TrendingUp }`. Batasi `Sales Order` jadi `roles: ["admin"]` agar kasir tidak tersesat ke flow grosir. Jangan hapus route-nya — hanya menu (no broken links).

- [ ] **Step 4: Dashboard butik**

`dashboard.ts` `DashboardSummary` tambah `todayOmzet`, `todayItemsSold`, `lowStockVariants: { variant_id, product_name, size, color, current_stock, min_stock }[]`. `dashboard-client.tsx` tambah kartu "Omzet Hari Ini" + daftar stok menipis per varian (ganti/pendamping `lowStock` produk yang sekarang ambigu untuk barang bervarian).

- [ ] **Step 5: Seed fashion + commit**

`docs/seed-butik-fashion.md`: kategori (Atasan, Bawahan, Dress, Hijab, Aksesoris), preset size, 10 contoh produk + varian + SKU contoh (`BLS-001-M-HITAM`), customer `UMUM`, akun kas. Commit semuanya: `feat: laporan butik dan slimming menu kasir`.

### Task 7: Hardening + UAT butik (DoD)

- [ ] **Step 1: Skenario gagal (wajib, bukan happy-path saja)**

Uji dan catat: jual melebihi stok varian (ditolak tanpa override), SKU varian duplikat, bayar tunai kurang, posting 2x (retry tidak dobel movement), invoice batal tidak mengurangi stok. Acuan: `CLAUDE.md` Review checklist + `prd-erp-retail.md` §11.

- [ ] **Step 2: Konsistensi skema-dokumen**

`grep product_variant_id skema-database-erp.md functions/postStockOpname/src src/lib` — setiap field baru di kode harus ada di skema (CLAUDE.md #3). Perbaiki yang tercecer di commit yang sama dengan kode.

- [ ] **Step 3: UAT kasir 15 menit bersama owner**

Skenario: tambah model + 3 varian → terima barang (GR) → jual via `/pos` tunai + QRIS → cek `/reports/butik`. Kriteria lolos: kasir non-teknis selesai tanpa panduan tertulis.

- [ ] **Step 4: Commit + tutup**

```bash
git add -A && git commit -m "chore: hardening UAT butik fashion"
```

### Task 8: Rantai varian utuh — GR/opname/retur sadar-varian (tambahan pasca final-review NO-GO)

Temuan final review: stok varian hanya bisa keluar (invoice) tapi tidak bisa masuk (GR/opname) dan retur tidak mengembalikan stok varian — rantai putus, UAT live pasti gagal. Task 8 menutupnya dalam 3 sub-task:

- **8a — Function + skema item**: `product_variant_id` opsional ditambah ke `goods_receipt_items`, `stock_opname_items`, `sales_return_items`, `purchase_return_items` (skema-database-erp.md, satu commit dengan kode); handler GR/opname/sales-return/purchase-return di `functions/postStockOpname` menulis movement + update 2 level stok per varian, atomic, TDD (`test/variant-gr-opname-return.test.mjs`); sekalian betulkan tipe `ProductVariant` (tambah `updated_by/at` opsional).
- **8b — UI**: form Goods Receipt, Stock Opname, Sales Return, Purchase Return dapat pemilih varian per baris (lib validasi + actions meneruskan; pola Task 3/5).
- **8c — Dokumen + verifikasi**: selaraskan `docs/seed-butik-fashion.md` + `docs/uat-butik-fashion.md` dengan kemampuan aktual; verifikasi rantai penuh (masuk→jual→retur) + re-run seluruh test; final review ulang sebelum merge.

Tetap di luar scope: SO internal tanpa rincian varian, unifikasi dual-implementasi builder vs index (dicatat follow-up).

## Scope yang SENGAJA tidak dikerjakan

- Neraca/Arus Kas tetap untuk `admin`/`finance` (tidak dihapus, hanya tidak dipromosikan ke kasir).
- Payroll tidak disentuh.
- Retur per varian mengikuti pola Task 4 di iterasi berikutnya (belum di plan ini).
- QRIS memakai enum payment existing (`bank_transfer`/`other` + reference) — tambah enum `qris` di iterasi berikutnya bila owner minta struk terpisah.




