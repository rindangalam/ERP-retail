# CLAUDE.md — Protokol Kerja Agent untuk Proyek ERP Retail

File ini adalah instruksi kerja untuk agent (Claude Code atau agent lain) yang mengerjakan development proyek ini. Dibaca otomatis di awal setiap sesi kerja pada repo ini.

## Tentang proyek ini

ERP retail single-lokasi — Next.js (App Router, TypeScript) + Appwrite (Auth, Database, Functions, Storage). Lima modul: Inventory, Purchasing, Sales, Finance & Akuntansi, HR & Payroll.

Dokumen acuan wajib dibaca sebelum bekerja:
- `prd-erp-retail.md` — requirement produk, acceptance criteria per fitur
- `skema-database-erp.md` — struktur collection, attribute, index, dan matriks permission

## Keputusan arsitektur yang mengikat

- Foreign key disimpan manual (string ID Appwrite Document, 36 karakter) — **bukan** native Relationship attribute Appwrite
- `stock_movements` dan `journal_entries` **hanya** boleh ditulis lewat Appwrite Function (server-side, API key) — tidak pernah langsung dari client atau Server Action biasa
- Setiap `journal_entries` wajib lolos validasi total debit = total kredit sebelum disimpan
- RBAC berbasis Appwrite Teams, mengikuti matriks di `skema-database-erp.md`

Perubahan terhadap keputusan di atas butuh konfirmasi eksplisit dari user — jangan diubah sepihak oleh agent.

---

## Loop kerja: Read → Think → Build → Review → Fix → Next Step ("Grilling Loop")

Setiap task diproses lewat enam tahap ini, tanpa dilompati — kecuali fix trivial (typo, format, komentar).

### 1. Read
Sebelum menulis kode apa pun:
- Baca bagian PRD yang relevan dengan task — pastikan paham acceptance criteria-nya
- Baca skema database terkait — jangan asumsikan struktur data, cek attribute & index yang sudah didefinisikan
- Baca kode modul lain yang polanya mirip (Function, Server Action, komponen) supaya konsisten, jangan menciptakan pola baru tanpa alasan
- Kalau task menyentuh Appwrite Function, baca Function lain yang sudah ada dulu untuk konsistensi trigger & error handling

Kalau requirement tidak jelas dari bacaan di atas, **berhenti** — lanjut ke bagian Eskalasi, jangan menebak.

### 2. Think
Sebelum implementasi, rumuskan secara eksplisit (boleh singkat, tidak perlu esai):
- Apa perubahan minimal yang menyelesaikan task ini?
- Data apa yang berubah, dan siapa yang boleh memicunya — client langsung atau wajib lewat Function?
- Edge case apa yang relevan: stok jadi negatif, jurnal tidak balance, transaksi diulang (retry/duplikat), user tanpa permission yang sesuai, qty/tanggal tidak valid?
- Apakah rencana ini konsisten dengan keputusan arsitektur di atas?

### 3. Build
- Implementasi dalam potongan kecil — satu fitur atau satu fix per iterasi, hindari mengubah banyak file sekaligus tanpa alasan jelas
- Ikuti struktur folder & konvensi penamaan yang sudah ada di repo
- Logic yang menyentuh stok atau jurnal keuangan wajib lewat Appwrite Function, sesuai keputusan arsitektur
- Prioritaskan kode yang predictable dan mudah di-review dibanding kode yang ringkas tapi susah dibaca

### 4. Review
Setelah build, agent me-review hasil kerjanya sendiri sebagai reviewer kedua yang skeptis, sebelum melapor selesai:
- [ ] Acceptance criteria dari PRD terpenuhi?
- [ ] Attribute/index yang dipakai sesuai `skema-database-erp.md` — bukan field baru yang belum didokumentasikan?
- [ ] Permission/role check benar (misal: staf gudang tidak bisa akses data payroll)?
- [ ] Ada input yang belum divalidasi (qty negatif, tanggal invalid, debit ≠ kredit)?
- [ ] Kalau proses gagal di tengah jalan, apakah bisa meninggalkan data tidak konsisten (partial write)?
- [ ] Sudah dites untuk skenario normal **dan** skenario gagal, bukan cuma happy path?

### 5. Fix
- Semua isu dari tahap Review wajib diperbaiki sebelum lanjut — jangan tandai task selesai dengan "known issue" tanpa persetujuan eksplisit dari user
- Setelah fix, ulangi review singkat untuk memastikan tidak ada regresi baru

### 6. Next Step
- Ringkas apa yang selesai dikerjakan, apa yang sudah divalidasi, dan file apa saja yang berubah
- Sebutkan task berikutnya yang logis mengacu ke roadmap fase di PRD — jangan diam-diam mengerjakan hal di luar scope task saat ini
- Kalau task berikutnya di luar scope yang sedang dikerjakan, konfirmasi dulu ke user sebelum lanjut

---

## Eskalasi — kapan harus berhenti dan bertanya, bukan menebak

- Requirement di PRD ambigu, atau bertentangan dengan skema database
- Task akan mengubah logic finance/payroll yang sudah berjalan (jurnal, perhitungan gaji)
- Butuh collection atau attribute baru yang belum ada di `skema-database-erp.md`
- Task diminta di luar scope MVP yang tercantum di PRD bagian "Out of Scope"

## Non-negotiable

1. `stock_movements` dan `journal_entries` hanya ditulis lewat Appwrite Function — tidak pernah langsung dari client atau Server Action biasa
2. Setiap `journal_entries` divalidasi total debit = total kredit sebelum disimpan
3. Perubahan skema database HARUS di-reflect balik ke `skema-database-erp.md` pada perubahan yang sama, tidak ditunda
4. Tidak mengerjakan fitur di luar scope MVP tanpa konfirmasi eksplisit dari user
