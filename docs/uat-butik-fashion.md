# UAT — Butik Fashion (Task 7 Hardening)

Branch: `feature/butik-fashion-focus`. Task 1–6 sudah merge di branch ini
(skema `product_variants`, validasi + DAL varian, UI varian, Function
sadar-varian, POS Menu Kasir (`/pos`), laporan Menu Laporan Butik
(`/reports/butik`) + slimming menu).
Task 7 = verifikasi akhir + checklist UAT, mengacu ke `CLAUDE.md`
Review checklist dan `prd-erp-retail.md` §11 Definition of Done.
Appwrite live di luar jangkauan — tidak ada integrasi baru ke Appwrite;
verifikasi memakai test otomatis yang ada + verifikasi statis (baca kode).

## 1. Hasil test otomatis

| Perintah | Hasil persis |
|---|---|
| `node --test src/lib/variant-validation.test.mjs` | 4 pass, 0 fail (`menolak size+color kosong bersamaan`, `menolak SKU kosong`, `menolak min_stock negatif`, `menerima input valid`) |
| `npm test --prefix functions/postStockOpname` | `core.test.mjs`: 13 passed, 0 failed (custom counter) · `variant.test.mjs`: 5 pass, 0 fail (`movement varian membawa product_variant_id + delta negatif + variant_updates`, `stok varian kurang TANPA override -> errors, tanpa movement`, `item tanpa varian -> movement tanpa field varian (backward-compat)`, `stok varian kurang DENGAN override -> movement tetap dibuat`, `varian milik produk lain -> errors, tanpa movement`) · `variant-gr-opname-return.test.mjs`: 16 pass, 0 fail (GR/ opname/ SR/ PR builder + GR handler 404/400/valid + PR handler ber-PO valid/400/404); `node --test` melaporkan total 22 pass, 0 fail |
| `npx tsc --noEmit` | 1 error, pre-existing di luar scope butik: `src/app/layout.tsx(25,50): error TS2304: Cannot find name 'LayoutProps'.` File tidak disentuh branch ini (`git diff master...HEAD -- src/app/layout.tsx` kosong; terakhir diubah commit tema). Tidak diperbaiki di Task 7 — lihat §5 (pre-existing, di luar scope butik, bukan follow-up butik). |

## 2. Skenario gagal (verifikasi statis + test)

| # | Skenario | Lokasi penanganan (baris) | Status |
|---|---|---|---|
| (a) | Jual melebihi stok varian tanpa override → ditolak | `functions/postStockOpname/src/core-sales-invoice.js:68-73` (tolak bila `available < qty` tanpa `allowOverride`); live posting `functions/postStockOpname/src/index.js:857-898` (cek stok produk lalu stok varian per `product_variant_id`, 409 bila kurang); test `functions/postStockOpname/test/variant.test.mjs:34-46` | Tertangani |
| (b) | SKU varian duplikat → ditolak | `src/lib/variants.ts:76-79` (`findVariantBySku` → `sku: "SKU sudah dipakai varian lain."`) + `src/lib/variants.ts:104-107` (catch `unique/duplicate/already exists` → error SKU yang sama) | Tertangani |
| (c) | Bayar tunai kurang → ditolak | `src/app/(app)/pos/actions.ts:82-87` (`cash` dan `cash_received < total` → `Tunai kurang ...`); transfer harus pas `actions.ts:88-90` | Tertangani |
| (d) | Retry posting 2x tidak dobel movement | `functions/postStockOpname/src/index.js:808-813` (invoice non-`draft` → 409, jadi retry sesudah `unpaid` ditolak); `index.js:914-921` (cek movement `sales_invoice` + `source_id` yang sama → `continue`, tidak tulis dobel). Pola yang sama: opname `index.js:120-126` (cek per `product_variant_id`), GR `index.js:319-329` (cek per `product_variant_id`), PR `index.js:566-576` & `:698-708` (cek per `product_variant_id`) + guard draft opname `:68-74`, GR `:213-218`, PR `:436-440` | Tertangani |
| (e) | Invoice batal tidak mengurangi stok | `src/lib/sales-invoice.ts:355-375` (`cancelSalesInvoice` hanya bila status `draft`, selain itu `code: "not_draft"`; cancel draft hanya update status → `cancelled`, tidak menulis `stock_movements`; invoice posted `unpaid/partial/paid` tak tersentuh). POS memakai pola yang sama untuk SO internal: `src/lib/sales-order.ts:399-419` (`cancelInternalCashSO` hanya `draft/confirmed`) | Tertangani |

Tidak ada skenario terbuka — tidak ada fix kode di Task 7.

## 7. Hasil UAT live (2026-09-23, database `erp` Appwrite)

Rantai dummy end-to-end dengan data bertanda `UAT-DUMMY`, varian `BLS-001-M-HITAM`
(produk `BLS-001`, customer `UMUM`, supplier `SUP-UAT`):

| Langkah | Dokumen | Hasil |
|---|---|---|
| PO 10 × 85.000 | `PO-20260923-001` | `ordered`, total 850.000 |
| GR 10 pcs varian + posting Function | `GR-20260923-001` | `posted`; stok varian 0 → **10**, induk 0 → 10 |
| Jurnal GR | `JE-009` | Debit = Kredit = **850.000** (Persediaan / Hutang Usaha) |
| SO internal + invoice 2 × 149.000 + posting | `SO-20260923-001`, `INV-20260923-001` | status `unpaid` → stok 10 → **8** |
| Jurnal invoice | `JE-010` | Debit = Kredit = **298.000** (Piutang / Pendapatan) |
| Payment tunai 298.000 | — | invoice `unpaid` → **`paid`** |
| Retur 1 pcs + posting | `SR-20260923-001` | `posted`; stok 8 → **9**, total invoice 298.000 → **149.000** |
| Agregat akhir | — | omzet hari ini **149.000**, margin (149.000−85.000)×2 = **128.000**, jurnal di DB 8 → **10** |

Semua gate lolos. Dua temuan dicatat sebagai follow-up (bukan blocker UAT):

1. **Retur penjualan tidak membuat jurnal** (`handlePostSalesReturn` hanya mengembalikan stok + menurunkan total invoice). Omzet (berbasis invoice) benar 149.000, tapi Laba Rugi (berbasis jurnal) masih mencatat pendapatan 298.000. Perlu keputusan akuntansi owner sebelum dibuatkan jurnal retur.
2. **Kelebihan bayar pasca-retur** (bayar 298.000 vs total baru 149.000) harus di-refund manual di luar sistem — aplikasi belum punya alur refund.
3. Catatan teknis: `responseBody` eksekusi Function kosong bila dibaca via REST mentah, tapi **terisi normal via `node-appwrite` SDK** (yang dipakai aplikasi) — aplikasi tidak terdampak.

## 2A. Rantai varian utuh (verifikasi statis + test, tanpa Appwrite live)

Contoh angka (dihitung dari tanda delta kode, bukan live): terima 10 pcs
varian `BLS-001-M-HITAM` via Menu Goods Receipt → stok varian 10; jual 2 pcs
via Menu Kasir (`/pos`) → stok 8; retur jual 1 pc via Menu Sales Return →
stok akhir 9. Opname varian: sistem 9 vs aktual 9 → selisih 0 (skip);
aktual 10 → adjustment +1. Produk bervarian TIDAK diopname di level induk.

| Huruf | Alur | Lokasi kode | Test | Status |
|---|---|---|---|---|
| (a) MASUK | GR item bervarian → movement `goods_receipt` delta +qty + `product_variant_id` + `current_stock` varian bertambah | builder `functions/postStockOpname/src/core.js:214-225` via `buildVariantStockPlan:168-212`; handler `functions/postStockOpname/src/index.js:278-300` (tolak varian tak dikenal 404 / asing 400 sebelum write) + `:316-366` (movement + update `product_variants.current_stock`) | `test/variant-gr-opname-return.test.mjs:33-45` (builder delta positif + `variant_updates`) + `:212-243` (handler mock: 404/400 tanpa write, valid membawa `product_variant_id`) | Tertangani (kode+test) |
| (b) OPNAME | Adjustment per varian (`actual - system` dari stok varian); induk bervarian ditolak | builder `functions/postStockOpname/src/core.js:18-77` (`product_variant_id` + `difference`); handler `functions/postStockOpname/src/index.js:81-90` (attach `variantMap`), `:97-105` (404), `:137-155` (guard stok varian 409), `:157-190` (movement + update stok varian); gate UI `src/lib/opname.ts:207-233` (induk bervarian tanpa varian → error "pilih varian") | `test/variant-gr-opname-return.test.mjs:48-55` (adjustment +2 per varian), `:96-102` (tanpa varian = bentuk lama), `:127-134` (varian asing → error, item dikecualikan); handler level verifikasi statis (tanpa mock test — jujur) | Tertangani (builder test + handler statis) |
| (c) KELUAR | Invoice/POS mengurangi stok varian (delta −qty); stok kurang tanpa override ditolak | builder `functions/postStockOpname/src/core-sales-invoice.js:27-127` (delta `-qty` `:60`, guard `:68-73`, movement `:76-87` + `variant_updates` `:92`); handler `src/index.js:825-854` (404/400), `:857-898` (cek stok varian 409), `:913-957` (movement + update stok varian); UI `src/app/(app)/pos/pos-client.tsx:110,169-174` → `src/app/(app)/pos/actions.ts:131-136` | `test/variant.test.mjs:23-70` (5 test: movement −2 + `variant_updates`, kurang tanpa override → errors tanpa movement, backward-compat, override lolos, varian asing → errors) | Tertangani (kode+test) |
| (d) KEMBALI | Sales return menambah (+qty), purchase return mengurangi (−qty) stok varian | SR builder `src/core.js:240-251`; SR handler `src/index.js:1060-1084` (validasi) + `:1092-1131` (movement positif + stok varian); PR builder `src/core.js:227-238`; PR handler `src/index.js:455-479` (validasi) + `:562-614` (ber-PO) & `:695-746` (tanpa PO, movement negatif + stok varian) | SR/PR builder `test/variant-gr-opname-return.test.mjs:58-85` (+3 SR / −2 PR + `variant_updates`) + `:104-116` (backward-compat); PR handler mock `:267-298` (valid tanpa crash + 400/404 sebelum write); SR handler verifikasi statis (tanpa mock test — jujur) | Tertangani (PR kode+test; SR builder test + handler statis) |
| (e) UI | 4 form + POS selalu mengirim `product_variant_id` (varian wajib untuk produk bervarian; retur dikunci mengikuti dokumen asal) | GR `goods-receipt-form.tsx:22,53,61,85,101,184` (dropdown + guard + kirim); Opname `stock-opname-client.tsx:408,473-490` + `stock-opname/actions.ts:99-104` (dropdown Varian wajib); PR `purchase-return-form.tsx:22,75,108,124,208` (prefill kunci `:57-61,70-80`); SR `sales-return-form.tsx:14,50,90,101,162` (prefill kunci `:47-54,78-82`); POS `pos-client.tsx:20,110,171` + `pos/actions.ts:18,133` | Verifikasi statis (baca kode; tanpa test UI otomatis — jujur) | Tertangani (statis) |

## 3. Konsistensi skema–dokumen (Step 2)

`grep product_variant_id` di `skema-database-erp.md`, `functions/postStockOpname/src`,
`src/lib`, `src/app`:

| Kemunculan di kode | Padanan di skema | Status |
|---|---|---|
| `functions/postStockOpname/src/core-sales-invoice.js:59,86` (baca/tulis `movement.product_variant_id`) | `skema-database-erp.md` §3.3 `stock_movements` baris 127 | OK |
| `functions/postStockOpname/src/index.js:826-836,933,948-956` (attach `_variant`, payload movement, update `product_variants.current_stock` — handler GR/PR/SR/opname Task 8 memakai kolom yang sama, mis. GR `:278-300,344,357-366`, opname `:81-90,167,181-190`, PR `:457-479,591,604-613`, SR `:1062-1084,1110,1121-1130`) | §3.3 baris 127 (`stock_movements.product_variant_id`) + §3.6 `product_variants` baris 170-186 | OK |
| `src/lib/sales-invoice.ts:50,122,156,257,298` (tipe + tulis/baca item invoice) | §5.5 `sales_invoice_items` baris 382 | OK |
| `src/lib/sales-invoice-validation.ts:8,65` (tipe input, bukan kolom DB) | §5.5 baris 382 (tipe cerminan, tidak perlu baris skema baru) | OK |
| `src/app/(app)/pos/actions.ts:18,133`, `src/app/(app)/pos/pos-client.tsx:20,110,171` (input keranjang → item invoice) | §5.5 baris 382 | OK |
| `src/lib/boutique-reports.ts:38,78,193,205`, `src/app/(app)/reports/butik/butik-client.tsx:113` (agregat/join + key tampilan, bukan kolom baru) | §5.5 baris 382 + §3.6 | OK |
| `src/lib/sales-order.ts:266` (komentar: SO internal tidak menyimpan `product_variant_id`) | Tidak ada kolom baru — sengaja, varian tercatat di invoice | OK |

Catatan skema §1.4 baris 51 menegaskan varian dibawa di `product_variant_id`
tanpa mengubah `movement_type`/`source_type`. Semua field baru di kode sudah
ada di skema — tidak ada yang tercecer, tidak ada perbaikan skema di Task 7.

## 4. Skenario UAT kasir 15 menit

Kriteria lolos: **kasir non-teknis selesai tanpa panduan tertulis**
(didampingi pengamat yang hanya menjawab pertanyaan lisan, tidak menunjuk klik).

Waktu: ±15 menit. Peran: 1 kasir + 1 pengamat. Siapkan: akun role
`admin`/`sales`, customer `UMUM` tersedia, 1 nama model baru
(mis. `Blus Linen Aruna`), 3 varian (mis. `S/Hitam`, `M/Hitam`, `M/Cream`).

| Menit | Langkah | Hasil yang diharapkan |
|---|---|---|
| 0-4 | Tambah model + 3 varian: buka Menu Produk (`/products`) → tombol Tambah Produk → buat produk `Blus Linen Aruna` (SKU induk) → buka produknya → tombol Tambah Varian → tambah 3 varian size/warna dengan SKU unik (`BLS-001-S-HITAM`, `BLS-001-M-HITAM`, `BLS-001-M-CREAM`), harga + field "Stok minimum" | Produk + 3 varian tersimpan dan tampil di daftar; SKU duplikat ditolak dengan pesan jelas |
| 4-7 | Terima barang: Menu Goods Receipt → tombol Terima Barang → pilih 3 varian → tombol Simpan (alternatif: Menu Stock Opname → tombol Buat Opname → Tambah Item → pilih Produk lalu wajib pilih Varian → isi Qty aktual → Simpan) → kembali ke Menu Produk, cek angka Stok di daftar varian > 0 | Angka Stok tiap varian bertambah; tidak ada stok negatif; opname induk tanpa varian ditolak |
| 7-11 | Jual tunai via Menu Kasir (`/pos`): pilih varian 1 (qty 1) + varian 2 (qty 2) → tombol Tunai → isi field "Tunai diterima (Rp)" pas/lebih → tombol Bayar Rp... | Invoice terbit + lunas, label Kembalian tampil benar; stok kedua varian berkurang sesuai qty; varian ke-3 tidak berubah |
| 11-13 | Jual transfer via Menu Kasir (`/pos`): pilih varian 3 (qty 1) → tombol Transfer → field "Nominal transfer (Rp)" terisi pas (otomatis = total) → tombol Bayar Rp...; coba sekali bayar tunai kurang (kasir salah input: tombol Tunai + nominal di bawah total) | Transfer lunas; pembayaran tunai kurang ditolak dengan pesan `Tunai kurang ...` dan transaksi tidak setengah jalan |
| 13-15 | Cek Menu Laporan Butik (`/reports/butik`): atur periode → tombol Tampilkan → cek omzet hari ini, best-seller, stok rendah, margin | Omzet = total 2 struk; best-seller memuat 3 varian terjual; stok rendah sinkron dengan sisa; margin tampil |

Lolos bila: semua langkah selesai ≤ 15 menit, kasir tidak membuka panduan
tertulis, tidak ada error yang membingungkan (setiap penolakan ada pesan
bahasa Indonesia yang bisa ditindaklanjuti), dan angka stok/omzet di
Menu Laporan Butik (`/reports/butik`) cocok dengan 2 struk.

## 5. Follow-up non-blocker (dikumpulkan Task 1-8, bukan dikerjakan di Task 8c)

- Task 3: halaman produk & kasir (belum dikerjakan di Task 7):
  - N+1: 1 query varian per produk di DUA lokasi — `src/app/(app)/products/page.tsx:16-25` DAN `src/app/(app)/pos/page.tsx:13-22` (laporan butik sudah batching/chunk-30 di `src/lib/boutique-reports.ts:15-26` — pola yang sama belum diterapkan ke kedua halaman).
  - Reset form: konsistensi reset field form varian setelah simpan.
  - Toast ganda: duplikasi notifikasi sukses/error setelah aksi varian.
  - String Inggris: sisa string bahasa Inggris di UI varian yang perlu di-Indonesiakan.
- Task 2: barcode-duplikat + Result shape (validasi `barcode` unik + bentuk `Result`/error DAL varian belum diseragamkan dengan modul lain).
- Task 6: komentar query understated + limit 500 dashboard + timezone UTC/WIB + margin pre-diskon (komentar strategi query laporan meremehkan biaya; limit 500 di agregat dashboard; inkonsistensi zona waktu UTC vs WIB di tanggal laporan; margin dihitung pre-diskon).
- Task 8 out-of-scope (follow-up): SO internal tanpa rincian varian — `src/lib/sales-order.ts:266` sengaja tanpa `product_variant_id`, varian baru tercatat di invoice; bila owner butuh SO per-varian, jadikan task tersendiri.
- Task 8 out-of-scope (follow-up): unifikasi dual-implementasi builder (`core.js`/`core-sales-invoice.js`) vs handler (`functions/postStockOpname/src/index.js`) — duplikasi guard varian 404/400 di kedua lapis; unifikasi dicatat, tidak dikerjakan.
- Pre-existing di luar scope (bukan follow-up butik): `npx tsc --noEmit` 1 error `src/app/layout.tsx:25` (`LayoutProps` tidak ditemukan) — file tidak disentuh branch ini, tidak diperbaiki di Task 7.

## 6. Pemetaan Definition of Done (`prd-erp-retail.md` §11)

1. FR modul terpenuhi dengan AC lulus — varian end-to-end (produk → terima → POS → laporan) teruji di §1, §2, §2A, §4.
2. Konsistensi lintas modul (stok; jurnal tidak diverifikasi live di Task 7 — Appwrite live di luar jangkauan — ditunda sebagai follow-up) — posting sadar-varian atomic + guard duplikat (§2d), skema–kode sinkron (§3).
3. Role tak berwenang diblokir — POS `requireRole(["admin","sales"])` (`pos/page.tsx:9`, `pos/actions.ts:49`), laporan butik `requireRole(["admin","sales"])` (`reports/butik/page.tsx:17`), DAL varian write `admin/warehouse` (`src/lib/variants.ts:28-30`).
4. Skenario gagal diuji — §2 (5/5 tertangani, berbasis test + baca kode, bukan happy path saja).
