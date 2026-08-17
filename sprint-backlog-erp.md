# Sprint Backlog — ERP Retail

Breakdown 7 fase roadmap menjadi sprint 2 mingguan dengan ticket konkret. Setiap ticket dikerjakan mengikuti Grilling Loop di `CLAUDE.md` dan mengacu ke acceptance criteria di `prd-erp-retail.md`.

Estimasi total: **9 sprint (~18 minggu)** untuk 1 developer full-time. Kalau tim 2-3 orang, sprint yang tidak saling bergantung (misal HR vs Finance) bisa dikerjakan paralel dan totalnya bisa dipangkas ke 5-6 sprint.

---

## Sprint 1 — Fondasi & Setup (Fase 0)
**Goal**: proyek bisa dijalankan, user bisa login, role sudah terpisah.

| Ticket | Deskripsi | Referensi |
|---|---|---|
| ERP-001 | Setup project Next.js (App Router, TypeScript, Tailwind, shadcn/ui) | — |
| ERP-002 | Setup koneksi Appwrite (Web SDK client + Node SDK server) | *ditunda sampai sprint ini benar-benar dimulai, sesuai keputusan sebelumnya* |
| ERP-003 | Setup Appwrite Auth + Teams (admin, warehouse, purchasing, sales, finance, hr) | FR-CORE-01 |
| ERP-004 | Collection `user_profiles` + permission dasar | skema §Core |
| ERP-005 | Layout dashboard, sidebar per role, middleware proteksi route | FR-CORE-01 |
| ERP-006 | Setup Appwrite CLI + `appwrite.json` awal (infra-as-code) | — |

**DoD sprint**: user dari tiap role bisa login dan hanya melihat menu sesuai rolenya.

---

## Sprint 2 — Inventory bagian 1 (Fase 1)
**Goal**: master produk & mesin pencatatan stok berjalan.

| Ticket | Deskripsi | Referensi |
|---|---|---|
| ERP-007 | Collection `product_categories` + `products`, validasi SKU unik | FR-INV-01 |
| ERP-008 | UI CRUD produk & kategori | FR-INV-01 |
| ERP-009 | Collection `stock_movements` + Appwrite Function `adjustStock` | FR-INV-02 |
| ERP-010 | Sinkronisasi `current_stock` dengan akumulasi `stock_movements` | FR-INV-02 |

**DoD sprint**: perubahan `stock_movements` selalu tercermin akurat di `current_stock` produk, teruji untuk skenario stok jadi negatif.

---

## Sprint 3 — Inventory bagian 2 + mulai Purchasing (Fase 1 → 2)
**Goal**: opname & alert stok selesai, master data purchasing siap.

| Ticket | Deskripsi | Referensi |
|---|---|---|
| ERP-011 | Stock opname — UI + collection `stock_opname`/`stock_opname_items` | FR-INV-03 |
| ERP-012 | Alert stok rendah (widget dashboard) | FR-INV-04 |
| ERP-013 | Collection `suppliers` + CRUD | FR-PUR-01 |
| ERP-014 | Collection `purchase_orders`/`purchase_order_items` + UI buat PO | FR-PUR-02 |

**DoD sprint**: opname yang di-posting otomatis menghasilkan `stock_movements` tipe adjustment yang benar.

---

## Sprint 4 — Purchasing selesai + mulai Sales (Fase 2 → 3)
**Goal**: siklus pembelian lengkap dari PO sampai stok & jurnal.

| Ticket | Deskripsi | Referensi |
|---|---|---|
| ERP-015 | Goods receipt (UI + collection) + Function `postGoodsReceipt` (stok + jurnal AP) | FR-PUR-03 |
| ERP-016 | Purchase returns | FR-PUR-04 |
| ERP-017 | Collection `customers` + CRUD | FR-SAL-01 |
| ERP-018 | Sales order — UI + collection (belum invoice) | FR-SAL-02 |

**DoD sprint**: goods receipt partial (qty sebagian) tidak boleh melebihi qty PO, dan otomatis membuat entry jurnal yang balance.

---

## Sprint 5 — Sales selesai (Fase 3)
**Goal**: siklus penjualan lengkap dari SO sampai pembayaran.

| Ticket | Deskripsi | Referensi |
|---|---|---|
| ERP-019 | Sales invoice + Function `postSalesInvoice` (kurangi stok + jurnal AR) | FR-SAL-02 |
| ERP-020 | Pencatatan pembayaran invoice + update status unpaid/partial/paid | FR-SAL-03 |
| ERP-021 | Sales returns | FR-SAL-04 |

**DoD sprint**: invoice tidak bisa terbit kalau stok tidak cukup (tanpa override eksplisit), dan status invoice selalu sinkron dengan total pembayaran.

---

## Sprint 6 — Finance bagian 1 (Fase 4)
**Goal**: fondasi akuntansi & jurnal otomatis terhubung ke transaksi yang sudah ada.

| Ticket | Deskripsi | Referensi |
|---|---|---|
| ERP-022 | Chart of Accounts — CRUD + seed data awal | FR-FIN-01 |
| ERP-023 | Journal engine — validasi debit = kredit, sambungkan ke Function Purchasing/Sales | FR-FIN-02 |
| ERP-024 | Cash & bank accounts + transactions | FR-FIN-03 |

**DoD sprint**: semua transaksi dari Sprint 4-5 (goods receipt, invoice, payment) sekarang otomatis menghasilkan entry jurnal yang balance — tidak ada transaksi yang lolos tanpa jurnal.

---

## Sprint 7 — Finance bagian 2 + mulai HR (Fase 4 → 5)
**Goal**: laporan keuangan dasar tersedia, master data HR siap.

| Ticket | Deskripsi | Referensi |
|---|---|---|
| ERP-025 | Laporan Neraca (Balance Sheet) | FR-FIN-04 |
| ERP-026 | Laporan Laba Rugi (P&L) | FR-FIN-04 |
| ERP-027 | Laporan Arus Kas (Cash Flow) | FR-FIN-04 |
| ERP-028 | Collection `employees` + `salary_components` | FR-HR-01, FR-HR-02 |

**DoD sprint**: ketiga laporan dihitung real-time dari `journal_entries`, bukan cache manual — divalidasi dengan data dummy yang totalnya sudah diketahui.

---

## Sprint 8 — HR selesai + mulai integrasi (Fase 5 → 6)
**Goal**: payroll lengkap dan jurnal otomatis, dashboard mulai dibangun.

| Ticket | Deskripsi | Referensi |
|---|---|---|
| ERP-029 | Payroll run — UI + collection + Function `postPayroll` (jurnal beban gaji) | FR-HR-03 |
| ERP-030 | Slip gaji (generate PDF + simpan ke Storage) | FR-HR-04 |
| ERP-031 | Dashboard ringkasan lintas modul (mulai) | — |

**DoD sprint**: satu karyawan tidak bisa muncul dua kali dalam periode payroll yang sama; posting payroll otomatis membuat jurnal beban gaji yang balance.

---

## Sprint 9 — Hardening & go-live prep (Fase 6)
**Goal**: sistem siap dipakai harian oleh bisnis nyata.

| Ticket | Deskripsi | Referensi |
|---|---|---|
| ERP-032 | Review & perketat permission semua collection sesuai matriks role | skema §Permission |
| ERP-033 | Audit trail check menyeluruh (created_by, timestamp) | FR-CORE-02 |
| ERP-034 | Testing skenario gagal untuk semua Function kritikal (bukan cuma happy path) | CLAUDE.md §Review |
| ERP-035 | UAT bersama pemilik bisnis + perbaikan hasil UAT | — |

**DoD sprint**: seluruh checklist Definition of Done di PRD bagian 11 terpenuhi untuk kelima modul.

---

## Catatan penggunaan

- Ticket ERP-002 (koneksi Appwrite) sengaja tetap tercatat di Sprint 1 karena secara teknis itu prasyarat Fase 0 — tapi eksekusinya ditunda sampai sprint benar-benar dimulai, sesuai arahan sebelumnya.
- Kalau ada ticket baru di luar daftar ini yang muncul saat development, agent wajib cek dulu ke `prd-erp-retail.md` — kalau tidak ada FR yang menaunginya, itu tanda scope creep dan harus dikonfirmasi ke user dulu (lihat `CLAUDE.md` bagian Eskalasi).
