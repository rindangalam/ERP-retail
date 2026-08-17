# PRD — ERP Retail (Single Lokasi)

**Status**: Draft v1 · **Tanggal**: 14 Agustus 2026 · **Stack**: Next.js (App Router, TypeScript) + Appwrite

Dokumen terkait: `skema-database-erp.md` (struktur database & permission), `CLAUDE.md` (protokol kerja agent development)

---

## 1. Ringkasan Produk

Sistem ERP internal untuk bisnis retail/dagang single-lokasi yang menyatukan lima fungsi operasional — **Inventory, Purchasing, Sales, Finance & Akuntansi, HR & Payroll** — dalam satu platform, sehingga satu transaksi (misal invoice penjualan) otomatis tercermin di stok dan pembukuan tanpa entry ganda.

### Masalah yang diselesaikan
Bisnis retail pada umumnya mengelola stok, penjualan, pembelian, dan pembukuan secara terpisah (Excel, aplikasi kasir berdiri sendiri, catatan manual). Akibatnya: data stok tidak sinkron dengan penjualan riil, tutup buku bulanan lambat karena rekonsiliasi manual, dan pemilik bisnis tidak punya visibility real-time atas kondisi kas dan stok.

### Tujuan produk
Satu sumber kebenaran (single source of truth) untuk data stok, transaksi, dan keuangan — setiap transaksi purchasing/sales otomatis memposting ke stok dan jurnal lewat business logic di backend, bukan input manual berulang.

---

## 2. Tujuan Bisnis & Success Metrics

| Metrik | Kondisi saat ini (asumsi) | Target setelah go-live |
|---|---|---|
| Waktu tutup buku bulanan | Manual, berhari-hari | Laporan Neraca/Laba-Rugi tersedia real-time, tidak perlu proses tutup buku manual |
| Selisih stok opname vs sistem | Tidak terukur/tinggi | Selisih terlacak per opname, tren mengecil tiap siklus |
| Duplikasi entry data (stok vs pembukuan) | Entry manual dobel | 0% — semua transaksi purchasing/sales otomatis memposting ke stok & jurnal |
| Waktu proses payroll bulanan | Manual per karyawan | < 1 hari kerja untuk seluruh karyawan |

> Angka target di atas placeholder — sebaiknya dikonfirmasi ulang dengan pemilik bisnis sebelum development dimulai, karena PRD ini tidak punya data baseline aktual.

---

## 3. Target Pengguna (Roles)

| Role | Job to be done |
|---|---|
| **Admin** (owner/manajer) | Melihat seluruh laporan, mengelola user & konfigurasi, approval lintas modul |
| **Warehouse** | Kelola master produk, catat stok masuk/keluar, stock opname |
| **Purchasing** | Kelola supplier, buat PO, retur pembelian |
| **Sales** | Kelola customer, buat sales order/invoice, retur penjualan |
| **Finance** | Kelola COA, pantau jurnal, kas/bank, buat laporan keuangan |
| **HR** | Kelola data karyawan, jalankan payroll, terbitkan slip gaji |

---

## 4. Ruang Lingkup MVP

### In-scope
Lima modul inti: Inventory, Purchasing, Sales, Finance & Akuntansi, HR & Payroll — detail fitur di bagian 5.

### Out-of-scope (dicatat sebagai backlog, bukan dihapus)
- Multi-cabang/multi-gudang (skema DB sudah siap untuk ini, tapi UI/logic belum diimplementasi)
- Manufacturing / Bill of Materials / production planning
- Integrasi pajak otomatis (e-Faktur, e-Bupot, dsb)
- Aplikasi mobile terpisah (native)
- Multi-currency
- Approval workflow berjenjang (multi-level approval untuk PO/invoice besar)
- Dashboard analytics/BI mendalam — MVP hanya laporan keuangan dasar

---

## 5. Functional Requirements

Format: `FR-[modul]-[nomor]` — deskripsi dalam bentuk user story + acceptance criteria (AC).

### 5.0 Cross-cutting

**FR-CORE-01 — Role-based access control**
Sebagai admin, saya ingin setiap fitur & data dibatasi sesuai role user, supaya data sensitif (payroll, jurnal keuangan) tidak bisa diakses role yang tidak berwenang.
- AC: matriks permission mengikuti `skema-database-erp.md` bagian "Strategi permission per role"
- AC: staf non-finance/non-admin tidak bisa melihat detail gaji karyawan lain

**FR-CORE-02 — Audit trail**
Sebagai admin, saya ingin setiap transaksi kritikal (stok, jurnal, payroll) tercatat siapa yang membuat dan kapan, supaya bisa ditelusuri kalau ada masalah.
- AC: field `created_by` dan timestamp wajib ada di semua collection transaksional

### 5.1 Inventory

**FR-INV-01 — Kelola master produk**
Sebagai staf warehouse, saya ingin menambah/mengedit/menonaktifkan produk (SKU, kategori, satuan, harga beli, harga jual, stok minimum), supaya data produk konsisten dipakai modul lain.
- AC: SKU unik, sistem menolak SKU duplikat
- AC: produk yang sudah pernah bertransaksi tidak bisa dihapus permanen, hanya dinonaktifkan
- AC: perubahan harga tidak mengubah nilai di transaksi historis yang sudah terjadi

**FR-INV-02 — Pencatatan stok otomatis**
Sebagai sistem, stok produk otomatis bertambah saat goods receipt di-posting dan otomatis berkurang saat invoice penjualan diterbitkan.
- AC: setiap perubahan stok tercatat di `stock_movements` dengan referensi ke transaksi asal
- AC: `current_stock` di produk selalu sinkron dengan akumulasi `stock_movements`
- AC: sistem menampilkan peringatan (dan default memblokir, kecuali ada override eksplisit) kalau transaksi akan membuat stok negatif

**FR-INV-03 — Stock opname**
Sebagai staf warehouse, saya ingin mencatat hasil hitung fisik dan membandingkannya dengan stok sistem, supaya selisih terdeteksi dan bisa disesuaikan.
- AC: posting opname otomatis membuat `stock_movements` tipe adjustment sesuai selisih

**FR-INV-04 — Alert stok rendah**
Sebagai warehouse/admin, saya ingin melihat daftar produk dengan stok di bawah `min_stock`, supaya reorder tidak terlambat.

### 5.2 Purchasing

**FR-PUR-01 — Kelola master supplier**
Sebagai staf purchasing, saya ingin mengelola data supplier (kontak, termin pembayaran), supaya PO bisa dibuat dengan data lengkap.

**FR-PUR-02 — Buat Purchase Order**
Sebagai staf purchasing, saya ingin membuat PO berisi daftar produk & qty ke supplier tertentu, supaya rencana pembelian tercatat sebelum barang datang.
- AC: PO punya status draft/ordered/partial/received/cancelled
- AC: PO tidak bisa diedit setelah status "received"

**FR-PUR-03 — Penerimaan barang (Goods Receipt)**
Sebagai staf warehouse, saya ingin mencatat barang yang diterima dari PO (boleh sebagian/partial), supaya stok bertambah otomatis dan status PO ter-update.
- AC: qty diterima tidak boleh melebihi qty yang di-order pada PO terkait
- AC: goods receipt otomatis memicu `stock_movements` (tambah stok) dan `journal_entries` (debit Persediaan, kredit Hutang Usaha)

**FR-PUR-04 — Retur pembelian**
Sebagai staf purchasing, saya ingin mencatat retur barang ke supplier, supaya stok dan hutang ter-update sesuai.

### 5.3 Sales

**FR-SAL-01 — Kelola master customer**
Sebagai staf sales, saya ingin mengelola data customer termasuk limit kredit, supaya piutang bisa dipantau.

**FR-SAL-02 — Sales Order & Invoice**
Sebagai staf sales, saya ingin membuat sales order lalu menerbitkan invoice, supaya penjualan tercatat dan stok otomatis berkurang.
- AC: invoice tidak bisa diterbitkan jika stok produk tidak mencukupi (kecuali override eksplisit oleh role yang berwenang)
- AC: penerbitan invoice otomatis memicu `stock_movements` (kurangi stok) dan `journal_entries` (debit Piutang/Kas, kredit Pendapatan Penjualan)

**FR-SAL-03 — Pencatatan pembayaran**
Sebagai staf sales/finance, saya ingin mencatat pembayaran customer terhadap invoice (boleh cicil), supaya status invoice (unpaid/partial/paid) dan saldo kas/bank ter-update otomatis.

**FR-SAL-04 — Retur penjualan**
Sebagai staf sales, saya ingin mencatat retur barang dari customer, supaya stok dan piutang ter-update sesuai.

### 5.4 Finance & Akuntansi

**FR-FIN-01 — Chart of Accounts**
Sebagai staf finance, saya ingin mengelola daftar akun (COA) bertipe asset/liability/equity/revenue/expense, supaya semua jurnal punya referensi akun yang konsisten.

**FR-FIN-02 — Jurnal otomatis dari transaksi**
Sebagai sistem, setiap transaksi purchasing (goods receipt), sales (invoice, pembayaran), dan payroll harus otomatis membuat entry jurnal yang balance, tanpa input manual staf finance.
- AC: entry jurnal ditolak sistem jika total debit ≠ total kredit
- AC: entry yang berasal dari transaksi otomatis tidak bisa diedit langsung oleh staf finance — hanya bisa dibalik (reversal), untuk menjaga jejak audit

**FR-FIN-03 — Kas & Bank**
Sebagai staf finance, saya ingin mencatat mutasi kas/bank termasuk transaksi manual (biaya operasional non-purchasing), supaya saldo kas/bank akurat.

**FR-FIN-04 — Laporan keuangan dasar**
Sebagai admin/finance, saya ingin melihat laporan Neraca, Laba Rugi, dan Arus Kas untuk periode tertentu, supaya kondisi keuangan bisnis terpantau.
- AC: laporan dihitung real-time dari `journal_entries`/`journal_entry_lines`, bukan dari snapshot manual

### 5.5 HR & Payroll

**FR-HR-01 — Kelola master karyawan**
Sebagai staf HR, saya ingin mengelola data karyawan (posisi, gaji pokok, tanggal masuk), supaya data payroll punya sumber yang akurat.

**FR-HR-02 — Komponen gaji**
Sebagai staf HR, saya ingin menambahkan tunjangan/potongan per karyawan, supaya perhitungan gaji bersih fleksibel sesuai kebijakan.

**FR-HR-03 — Proses payroll run**
Sebagai staf HR, saya ingin menjalankan proses payroll bulanan yang menghitung gaji bersih tiap karyawan (gaji pokok + tunjangan − potongan), supaya proses payroll cepat dan konsisten.
- AC: satu karyawan tidak boleh muncul dua kali dalam satu periode payroll yang sama
- AC: posting payroll run otomatis memicu `journal_entries` (debit Beban Gaji, kredit Kas/Utang Gaji)

**FR-HR-04 — Slip gaji**
Sebagai karyawan (lewat sistem HR), saya ingin slip gaji tersedia sebagai dokumen yang bisa diunduh, supaya transparan dan bisa disimpan.

---

## 6. Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| **Performa** | List produk/transaksi (hingga ±5.000 baris) termuat < 2 detik; pencarian produk < 500ms |
| **Keamanan** | RBAC ketat per modul; data payroll & jurnal hanya diakses role berwenang; tidak ada write langsung ke `stock_movements`/`journal_entries` dari client |
| **Konsistensi data** | Setiap transaksi purchasing/sales WAJIB atomic terhadap stok & jurnal — tidak boleh ada state "setengah jalan" (invoice terbit tapi jurnal gagal dibuat) |
| **Auditability** | Semua perubahan data kritikal tercatat pelaku & waktunya |
| **Usability** | UI harus bisa dipakai staf non-teknis (gudang/kasir) tanpa training panjang |
| **Ketersediaan** | Sistem internal — target reliable selama jam operasional, bukan SLA 24/7 mission-critical |

---

## 7. Keputusan Teknis (ringkas)

Detail lengkap ada di `skema-database-erp.md`. Ringkasan keputusan yang mengikat development:

- Stack: Next.js App Router + TypeScript, Appwrite (Auth, Database, Functions, Storage)
- Skala MVP: single lokasi/gudang (skema disiapkan agar mudah diperluas ke multi-cabang)
- Foreign key disimpan manual (string ID), bukan native Relationship attribute Appwrite (masih eksperimental)
- Write ke `stock_movements` dan `journal_entries` hanya lewat Appwrite Function, tidak langsung dari client

---

## 8. Asumsi & Dependensi

- Tim development sudah punya akses ke instance Appwrite (cloud/self-hosted) sebelum development modul dimulai
- Chart of Accounts awal dan data master (kategori produk, dsb) disiapkan oleh pemilik bisnis sebelum go-live, bukan hasil development
- Tidak ada integrasi pihak ketiga (payment gateway, e-Faktur) di MVP ini

---

## 9. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Appwrite Relationship attribute masih eksperimental, berisiko berubah | Sudah diputuskan pakai manual FK (lihat skema DB) |
| Modul Finance kompleks — jurnal harus selalu balance | Validasi ketat di level Appwrite Function + testing skenario gagal, bukan hanya skenario normal |
| Scope creep — ERP secara alami cenderung melebar | Batasan MVP di bagian 4 bersifat mengikat; fitur baru masuk backlog fase berikutnya, bukan disisipkan ke sprint berjalan |
| Ketergantungan pada satu developer/tim kecil | Roadmap difase agar tiap modul bisa diverifikasi berdiri sendiri sebelum lanjut ke modul berikutnya |

---

## 10. Milestone

Mengikuti roadmap 7 fase yang sudah disepakati (Fase 0 Fondasi → Fase 1 Inventory → Fase 2 Purchasing → Fase 3 Sales → Fase 4 Finance → Fase 5 HR & Payroll → Fase 6 Integrasi & Hardening). Estimasi total 14–20 minggu (1 developer) atau 8–12 minggu (tim 2–3 orang paralel).

---

## 11. Definition of Done (level produk)

Sebuah modul dianggap selesai untuk MVP kalau:
1. Semua FR di modul tersebut terpenuhi dengan AC lulus
2. Data yang dihasilkan modul tersebut konsisten dengan modul lain yang bergantung padanya (stok, jurnal)
3. Role yang tidak berwenang tidak bisa mengakses data/aksi di modul tersebut
4. Sudah diuji dengan skenario gagal (bukan hanya happy path) — lihat protokol di `CLAUDE.md`
