# Panduan UAT Manual Kasir — Butik Fashion

Skenario bersih memakai varian **stok 0** (`KMS-002-L-PUTIH`):
**terima 5 → jual 2 → retur 1 → stok akhir 4**.
Berlaku untuk database pasca-wipe (supplier `FSH-001`/`FSH-002`, tanpa data UAT-DUMMY).

Data acuan: `KMS-002 Kemeja Katun Basic`, modal Rp75.000, jual **Rp129.000**,
customer `UMUM`. Password semua akun: `password`.

## 0. Persiapan (±5 menit)

1. Di laptop/PC toko, buka terminal di folder `ERP-retail`, jalankan `npm run dev`,
   tunggu sampai muncul `Ready`, buka browser ke `http://localhost:3000`.
2. Akun yang dipakai bergantian (logout via menu profil tiap ganti peran):
   - `purchasing@erp.local` — buat + kirim PO
   - `warehouse@erp.local` — terima + posting barang (boleh diganti `admin@erp.local`)
   - `sales@erp.local` — kasir + retur + laporan
   - `finance@erp.local` atau `admin@erp.local` — cek jurnal
3. Cek awal (login `sales@erp.local`): Menu **Produk** → cari `KMS-002` →
   varian `L / PUTIH` → pastikan **Stok = 0**. Bila bukan 0, STOP dan laporkan
   (jangan lanjut — ekspektasi angka di bawah tidak berlaku).

## 1. Terima barang (login purchasing + warehouse, ±5 menit)

1. Login `purchasing@erp.local` → Menu **Purchasing** → **Buat PO** →
   supplier `FSH-001 (Pemasok Garmen Fashion)` → tambah item produk
   `KMS-002 Kemeja Katun Basic`, Qty **5**, harga **75000** → **Simpan**.
2. Di daftar PO, buka PO tersebut → **Kirim** (status `draft` → `ordered`).
3. Logout, login `warehouse@erp.local` → Menu **Goods Receipt** →
   **Terima Barang** → pilih PO tadi → di baris item pilih **Varian**
   `L / PUTIH` → Qty **5** → **Simpan**.
4. Di daftar GR, buka GR tersebut → **Posting**.
5. ✅ **Harus terjadi**: Menu Produk → varian `L / PUTIH` stok = **5**.
   Bila Posting error, catat pesan errornya persis dan STOP di sini.

## 2. Jual di kasir (login sales, ±3 menit)

1. Login `sales@erp.local` → Menu **Kasir (`/pos`)** → customer `UMUM`.
2. Kolom cari ketik `KMS-002-L-PUTIH` → klik hasilnya → pastikan keranjang
   berisi varian `L / PUTIH` harga Rp129.000.
3. Qty = **2** → total harus **Rp258.000**.
4. Metode **Tunai** → Tunai diterima **258000** → Kembalian **Rp0** → **Bayar**.
5. ✅ **Harus terjadi**: muncul nomor invoice + kembalian 0.
   Cek Menu Produk → stok varian = **3**.

## 3. Retur 1 pcs (tetap sales, ±3 menit)

1. Menu **Sales Return** → **Buat** → pilih invoice Tahap 2 → Qty **1**
   (varian terkunci mengikuti invoice — tidak bisa diubah, itu disengaja) →
   **Simpan** → **Posting**.
2. ✅ **Harus terjadi**: stok varian = **4**.

## 4. Cek laporan + jurnal (±4 menit)

1. Menu **Laporan Butik** (tetap sales):
   - Omzet hari ini = **Rp129.000** (258.000 − retur 129.000)
   - Terlaris: `KMS-002 / L / PUTIH`, Qty 2
   - Margin kotor (sebelum diskon nota) = **Rp108.000** ((129.000−75.000) × 2)
2. Login `finance@erp.local` (atau admin) → Menu **Jurnal Umum** → cari 2 entry
   baru: GR total **375.000** (Persediaan / Hutang Usaha) dan invoice total
   **258.000** (Piutang / Pendapatan). ✅ Keduanya **debit = kredit persis**.
3. **Kriteria lolos**: semua ✅ terpenuhi tanpa panduan selain dokumen ini.

## 5. Bila gagal — format laporan

- Nomor langkah di atas + **pesan error persis** (screenshot lebih baik)
- Nomor dokumen (PO/GR/invoice/retur) bila sudah terbentuk
- Akun/role yang dipakai

## 6. Catatan

- Data UAT tercatat permanen (jejak audit). Jangan ulangi skenario ini dengan
  varian yang sama tanpa menghitung ulang ekspektasi stok.
- Diketahui dan diterima: retur tidak membuat jurnal (Laba Rugi masih mencatat
  258.000) dan kelebihan bayar pasca-retur di-refund manual — lihat
  `docs/uat-butik-fashion.md` §7.
