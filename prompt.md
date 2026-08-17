# Prompt per Sprint — ERP Retail

Kumpulan prompt siap pakai, satu per sprint. Salin isi blok kode di sprint yang mau dikerjakan, tempel sebagai prompt awal ke agent (Claude Code, dsb) di root project ini — asumsinya `CLAUDE.md`, `prd-erp-retail.md`, `skema-database-erp.md`, dan `sprint-backlog-erp.md` sudah ada di root, jadi agent bisa langsung membacanya.

Kerjakan sprint secara berurutan — jangan mulai sprint N+1 sebelum Definition of Done sprint N terpenuhi, karena tiap sprint bergantung pada hasil sprint sebelumnya.

---

## Sprint 1 — Fondasi & Setup

```
Kamu mengerjakan Sprint 1 dari proyek ERP retail ini. Sebelum mulai, baca file berikut di root project:
- CLAUDE.md — WAJIB diikuti untuk setiap ticket (loop Read → Think → Build → Review → Fix → Next Step)
- prd-erp-retail.md — bagian 3 (Target Pengguna/Roles), FR-CORE-01
- skema-database-erp.md — bagian Core (user_profiles) dan Strategi Permission
- sprint-backlog-erp.md — bagian "Sprint 1"

Tujuan sprint ini: proyek bisa dijalankan, user bisa login, dan role sudah terpisah.

Kerjakan ticket berikut secara berurutan, satu per satu. Jangan lanjut ke ticket berikutnya sebelum ticket sebelumnya lolos tahap Review di CLAUDE.md:

1. ERP-001 — Setup project Next.js (App Router, TypeScript, Tailwind, shadcn/ui)
2. ERP-002 — Setup koneksi Appwrite (Web SDK untuk client, Node SDK untuk server/Server Action)
3. ERP-003 — Setup Appwrite Auth + Teams: admin, warehouse, purchasing, sales, finance, hr
4. ERP-004 — Buat collection user_profiles sesuai skema, dengan permission dasar
5. ERP-005 — Layout dashboard, sidebar per role, middleware proteksi route sesuai role
6. ERP-006 — Setup Appwrite CLI + appwrite.json awal untuk infra-as-code

Definition of Done sprint ini: user dari tiap role bisa login dan hanya melihat menu yang sesuai rolenya masing-masing.

Kalau ada requirement yang ambigu, bertentangan dengan dokumen, atau butuh keputusan yang tidak tercakup di atas — berhenti dan tanya saya dulu. Jangan menebak atau mengerjakan hal di luar daftar ticket di atas tanpa konfirmasi.
```

---

## Sprint 2 — Inventory bagian 1

```
Kamu mengerjakan Sprint 2 dari proyek ERP retail ini. Sprint 1 (fondasi, auth, Teams) sudah selesai. Sebelum mulai, baca:
- CLAUDE.md — WAJIB diikuti untuk setiap ticket
- prd-erp-retail.md — FR-INV-01, FR-INV-02
- skema-database-erp.md — bagian Modul Inventory (product_categories, products, stock_movements)
- sprint-backlog-erp.md — bagian "Sprint 2"

Tujuan sprint ini: master produk dan mesin pencatatan stok berjalan.

Kerjakan ticket berikut secara berurutan:

1. ERP-007 — Collection product_categories dan products sesuai skema, validasi SKU unik
2. ERP-008 — UI CRUD produk & kategori (list, tambah, edit, nonaktifkan)
3. ERP-009 — Collection stock_movements + Appwrite Function `adjustStock` — INGAT: ini satu-satunya jalur resmi untuk mengubah stok, tidak boleh ada write stok langsung dari client
4. ERP-010 — Pastikan current_stock di produk selalu sinkron dengan akumulasi stock_movements

Definition of Done sprint ini: perubahan stock_movements selalu tercermin akurat di current_stock produk, dan sudah diuji untuk skenario yang membuat stok jadi negatif (harus diblokir/diberi warning, sesuai FR-INV-02).

Kalau ada requirement yang ambigu, bertentangan dengan dokumen, atau butuh keputusan yang tidak tercakup di atas — berhenti dan tanya saya dulu. Jangan menebak atau mengerjakan hal di luar daftar ticket di atas tanpa konfirmasi.
```

---

## Sprint 3 — Inventory bagian 2 + mulai Purchasing

```
Kamu mengerjakan Sprint 3 dari proyek ERP retail ini. Sprint 1-2 sudah selesai (auth, produk, stock_movements). Sebelum mulai, baca:
- CLAUDE.md — WAJIB diikuti untuk setiap ticket
- prd-erp-retail.md — FR-INV-03, FR-INV-04, FR-PUR-01, FR-PUR-02
- skema-database-erp.md — bagian stock_opname, dan Modul Purchasing (suppliers, purchase_orders)
- sprint-backlog-erp.md — bagian "Sprint 3"

Tujuan sprint ini: opname dan alert stok selesai, master data purchasing siap.

Kerjakan ticket berikut secara berurutan:

1. ERP-011 — Stock opname: UI + collection stock_opname dan stock_opname_items, posting opname harus menghasilkan stock_movements tipe adjustment
2. ERP-012 — Widget alert stok rendah di dashboard (produk dengan current_stock di bawah min_stock)
3. ERP-013 — Collection suppliers + CRUD
4. ERP-014 — Collection purchase_orders dan purchase_order_items + UI buat PO (status: draft/ordered/partial/received/cancelled)

Definition of Done sprint ini: opname yang di-posting otomatis menghasilkan stock_movements tipe adjustment dengan qty selisih yang benar, sudah diuji dengan kasus selisih positif dan negatif.

Kalau ada requirement yang ambigu, bertentangan dengan dokumen, atau butuh keputusan yang tidak tercakup di atas — berhenti dan tanya saya dulu. Jangan menebak atau mengerjakan hal di luar daftar ticket di atas tanpa konfirmasi.
```

---

## Sprint 4 — Purchasing selesai + mulai Sales

```
Kamu mengerjakan Sprint 4 dari proyek ERP retail ini. Purchase Order dan master supplier sudah ada dari Sprint 3. Sebelum mulai, baca:
- CLAUDE.md — WAJIB diikuti untuk setiap ticket
- prd-erp-retail.md — FR-PUR-03, FR-PUR-04, FR-SAL-01, FR-SAL-02
- skema-database-erp.md — bagian goods_receipts, purchase_returns, customers, sales_orders
- sprint-backlog-erp.md — bagian "Sprint 4"

Tujuan sprint ini: siklus pembelian lengkap dari PO sampai stok & jurnal, plus mulai siklus penjualan.

Kerjakan ticket berikut secara berurutan:

1. ERP-015 — Goods receipt: UI + collection, plus Appwrite Function `postGoodsReceipt` yang otomatis menambah stok (lewat adjustStock) DAN membuat journal_entries (debit Persediaan, kredit Hutang Usaha). Qty diterima tidak boleh melebihi qty di PO.
2. ERP-016 — Purchase returns: UI + collection, update stok dan hutang terkait
3. ERP-017 — Collection customers + CRUD, termasuk field credit_limit
4. ERP-018 — Sales order: UI + collection sales_orders/sales_order_items (belum invoice, itu di Sprint 5)

Definition of Done sprint ini: goods receipt partial (qty sebagian dari PO) tidak bisa melebihi qty yang di-order, dan setiap goods receipt yang diposting otomatis menghasilkan entry jurnal yang debit=kredit.

Kalau ada requirement yang ambigu, bertentangan dengan dokumen, atau butuh keputusan yang tidak tercakup di atas — berhenti dan tanya saya dulu. Jangan menebak atau mengerjakan hal di luar daftar ticket di atas tanpa konfirmasi.
```

---

## Sprint 5 — Sales selesai

```
Kamu mengerjakan Sprint 5 dari proyek ERP retail ini. Sales order dan master customer sudah ada dari Sprint 4. Sebelum mulai, baca:
- CLAUDE.md — WAJIB diikuti untuk setiap ticket
- prd-erp-retail.md — FR-SAL-02, FR-SAL-03, FR-SAL-04
- skema-database-erp.md — bagian sales_invoices, sales_payments, sales_returns
- sprint-backlog-erp.md — bagian "Sprint 5"

Tujuan sprint ini: siklus penjualan lengkap dari sales order sampai pembayaran.

Kerjakan ticket berikut secara berurutan:

1. ERP-019 — Sales invoice + Appwrite Function `postSalesInvoice` yang otomatis mengurangi stok (lewat adjustStock) DAN membuat journal_entries (debit Piutang/Kas, kredit Pendapatan Penjualan). Invoice TIDAK BOLEH terbit kalau stok tidak mencukupi, kecuali ada override eksplisit dari role berwenang.
2. ERP-020 — Pencatatan pembayaran invoice (boleh cicil/partial), status invoice (unpaid/partial/paid) harus otomatis ter-update
3. ERP-021 — Sales returns: UI + collection, update stok dan piutang terkait

Definition of Done sprint ini: invoice tidak bisa terbit kalau stok kurang, dan status invoice selalu sinkron dengan total pembayaran yang sudah masuk.

Kalau ada requirement yang ambigu, bertentangan dengan dokumen, atau butuh keputusan yang tidak tercakup di atas — berhenti dan tanya saya dulu. Jangan menebak atau mengerjakan hal di luar daftar ticket di atas tanpa konfirmasi.
```

---

## Sprint 6 — Finance bagian 1

```
Kamu mengerjakan Sprint 6 dari proyek ERP retail ini. Purchasing dan Sales sudah lengkap dan berjalan (Sprint 1-5). Sebelum mulai, baca:
- CLAUDE.md — WAJIB diikuti untuk setiap ticket
- prd-erp-retail.md — FR-FIN-01, FR-FIN-02, FR-FIN-03
- skema-database-erp.md — bagian Modul Finance & Akuntansi
- sprint-backlog-erp.md — bagian "Sprint 6"

Tujuan sprint ini: fondasi akuntansi berjalan dan jurnal otomatis tersambung ke transaksi yang sudah ada dari sprint sebelumnya.

Kerjakan ticket berikut secara berurutan:

1. ERP-022 — Chart of Accounts: CRUD + seed data awal (minimal akun Kas, Bank, Persediaan, Hutang Usaha, Piutang Usaha, Pendapatan Penjualan, Beban Gaji)
2. ERP-023 — Journal engine: validasi total_debit == total_credit sebelum entry disimpan, lalu SAMBUNGKAN ke Function postGoodsReceipt dan postSalesInvoice yang sudah dibuat di Sprint 4-5 (function itu sebelumnya baru mencatat stok, sekarang tambahkan pembuatan journal_entries di dalamnya)
3. ERP-024 — Collection cash_bank_accounts dan cash_bank_transactions, termasuk transaksi manual (biaya operasional)

Definition of Done sprint ini: semua transaksi goods receipt dan invoice dari Sprint 4-5 sekarang otomatis menghasilkan entry jurnal yang balance — tidak ada transaksi yang lolos tanpa jurnal. Uji dengan menelusuri beberapa transaksi lama dan pastikan jurnalnya benar.

Kalau ada requirement yang ambigu, bertentangan dengan dokumen, atau butuh keputusan yang tidak tercakup di atas — berhenti dan tanya saya dulu. Jangan menebak atau mengerjakan hal di luar daftar ticket di atas tanpa konfirmasi.
```

---

## Sprint 7 — Finance bagian 2 + mulai HR

```
Kamu mengerjakan Sprint 7 dari proyek ERP retail ini. Journal engine sudah berjalan dari Sprint 6. Sebelum mulai, baca:
- CLAUDE.md — WAJIB diikuti untuk setiap ticket
- prd-erp-retail.md — FR-FIN-04, FR-HR-01, FR-HR-02
- skema-database-erp.md — bagian journal_entry_lines, dan Modul HR & Payroll (employees, salary_components)
- sprint-backlog-erp.md — bagian "Sprint 7"

Tujuan sprint ini: laporan keuangan dasar tersedia, master data HR siap.

Kerjakan ticket berikut secara berurutan:

1. ERP-025 — Laporan Neraca (Balance Sheet) per tanggal, dihitung real-time dari journal_entry_lines berdasarkan account_type
2. ERP-026 — Laporan Laba Rugi (P&L) per periode
3. ERP-027 — Laporan Arus Kas (Cash Flow) per periode
4. ERP-028 — Collection employees + salary_components (allowance/deduction)

Definition of Done sprint ini: ketiga laporan dihitung real-time (tidak dari cache/snapshot manual), sudah divalidasi dengan skenario data dummy yang totalnya sudah diketahui sebelumnya (misal: total debit harus sama dengan total kredit di semua laporan).

Kalau ada requirement yang ambigu, bertentangan dengan dokumen, atau butuh keputusan yang tidak tercakup di atas — berhenti dan tanya saya dulu. Jangan menebak atau mengerjakan hal di luar daftar ticket di atas tanpa konfirmasi.
```

---

## Sprint 8 — HR selesai + mulai integrasi

```
Kamu mengerjakan Sprint 8 dari proyek ERP retail ini. Master data karyawan sudah ada dari Sprint 7, journal engine sudah berjalan dari Sprint 6. Sebelum mulai, baca:
- CLAUDE.md — WAJIB diikuti untuk setiap ticket
- prd-erp-retail.md — FR-HR-03, FR-HR-04
- skema-database-erp.md — bagian payroll_runs, payroll_details
- sprint-backlog-erp.md — bagian "Sprint 8"

Tujuan sprint ini: payroll lengkap dengan jurnal otomatis, dan dashboard lintas modul mulai dibangun.

Kerjakan ticket berikut secara berurutan:

1. ERP-029 — Payroll run: UI + collection + Appwrite Function `postPayroll` yang menghitung gaji bersih tiap karyawan (gaji pokok + tunjangan − potongan) dan otomatis membuat journal_entries (debit Beban Gaji, kredit Kas/Utang Gaji). Satu karyawan TIDAK BOLEH muncul dua kali dalam satu periode payroll yang sama — gunakan unique index compound [payroll_run_id, employee_id].
2. ERP-030 — Slip gaji: generate dokumen per karyawan, simpan ke Appwrite Storage, bisa diunduh
3. ERP-031 — Mulai dashboard ringkasan lintas modul (total stok, piutang, hutang, saldo kas — ambil dari modul yang sudah ada)

Definition of Done sprint ini: posting payroll run menghasilkan journal_entries yang balance untuk semua karyawan sekaligus, dan sudah diuji untuk mencegah duplikasi karyawan dalam periode yang sama.

Kalau ada requirement yang ambigu, bertentangan dengan dokumen, atau butuh keputusan yang tidak tercakup di atas — berhenti dan tanya saya dulu. Jangan menebak atau mengerjakan hal di luar daftar ticket di atas tanpa konfirmasi.
```

---

## Sprint 9 — Hardening & go-live prep

```
Kamu mengerjakan Sprint 9, sprint terakhir sebelum go-live, dari proyek ERP retail ini. Semua modul (Inventory, Purchasing, Sales, Finance, HR) sudah berfungsi dari Sprint 1-8. Sebelum mulai, baca:
- CLAUDE.md — WAJIB diikuti, terutama checklist di bagian Review
- prd-erp-retail.md — bagian 11 (Definition of Done level produk) dan FR-CORE-02
- skema-database-erp.md — bagian Strategi permission per role
- sprint-backlog-erp.md — bagian "Sprint 9"

Tujuan sprint ini: sistem siap dipakai harian oleh bisnis nyata, bukan cuma "berfungsi di demo".

Kerjakan ticket berikut secara berurutan:

1. ERP-032 — Review dan perketat permission SEMUA collection sesuai matriks role di skema-database-erp.md — cek satu per satu, jangan asumsi sudah benar dari sprint sebelumnya
2. ERP-033 — Audit trail check menyeluruh: pastikan created_by dan timestamp ada dan terisi benar di semua collection transaksional
3. ERP-034 — Testing skenario GAGAL untuk semua Appwrite Function kritikal (adjustStock, postGoodsReceipt, postSalesInvoice, postPayroll) — misalnya: apa yang terjadi kalau Function gagal di tengah proses, apakah data jadi tidak konsisten (partial write)? Perbaiki kalau ditemukan celah.
4. ERP-035 — Siapkan skenario UAT untuk pemilik bisnis (alur end-to-end: beli barang → stok masuk → jual barang → stok keluar → cek laporan keuangan → jalankan payroll), lalu perbaiki temuan dari UAT

Definition of Done sprint ini: seluruh checklist Definition of Done di prd-erp-retail.md bagian 11 terpenuhi untuk kelima modul, dan sistem sudah lolos UAT dengan pemilik bisnis.

Kalau ada requirement yang ambigu, bertentangan dengan dokumen, atau butuh keputusan yang tidak tercakup di atas — berhenti dan tanya saya dulu. Jangan menebak atau mengerjakan hal di luar daftar ticket di atas tanpa konfirmasi.
```
