# Panduan Seed Manual — Butik Fashion

Dokumen ini panduan pengisian data awal butik secara **manual via UI aplikasi**
(bukan script otomatis). Urutan penting karena ada relasi antar data.

## 1. Kategori Produk

Buat via menu **Kategori** (admin / warehouse):

| Nama | Deskripsi |
| --- | --- |
| Atasan | Blouse, kemeja, kaos, outer |
| Bawahan | Rok, celana, kulot |
| Dress | Dress, gamis, jumpsuit |
| Hijab | Segiempat, pashmina, instan |
| Aksesoris | Belt, bros, tas kecil |

## 2. Preset Size & Warna

Varian dibuat per produk via halaman detail produk. Gunakan ejaan konsisten:

- **Size pakaian:** `S`, `M`, `L`, `XL` (Pattern SKU: `{KODE}-{SIZE}-{WARNA}`)
- **Hijab / aksesoris:** size `ALL SIZE`
- **Warna (huruf kapital):** `HITAM`, `PUTIH`, `CREAM`, `NAVY`, `MAROON`, `OLIVE`, `ABU`, `COKLAT`, `PINK`, `HIJAU`

Contoh SKU: `BLS-001-M-HITAM` (Blouse 001, size M, Hitam).

## 3. Contoh 10 Produk + Varian

Buat via menu **Produk**. `cost` = modal (HPP), `jual` = harga banderol.

| # | SKU Induk | Nama | Kategori | Cost | Jual | Varian (size × warna) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLS-001 | Blouse Linen Premium | Atasan | 85.000 | 149.000 | S/M/L/XL × HITAM, PUTIH, CREAM — cth: `BLS-001-M-HITAM` |
| 2 | KMS-002 | Kemeja Katun Basic | Atasan | 75.000 | 129.000 | S/M/L/XL × PUTIH, NAVY, ABU — cth: `KMS-002-L-PUTIH` |
| 3 | KOS-003 | Kaos Oversize Sablon | Atasan | 45.000 | 89.000 | M/L/XL × HITAM, PUTIH, OLIVE — cth: `KOS-003-L-HITAM` |
| 4 | ROK-004 | Rok Plisket Panjang | Bawahan | 65.000 | 119.000 | S/M/L × HITAM, NAVY, MAROON — cth: `ROK-004-M-NAVY` |
| 5 | CLN-005 | Celana Kulot Linen | Bawahan | 70.000 | 125.000 | S/M/L/XL × CREAM, HITAM, OLIVE — cth: `CLN-005-S-CREAM` |
| 6 | DRS-006 | Dress Floral Midi | Dress | 110.000 | 199.000 | S/M/L × PINK, NAVY, HIJAU — cth: `DRS-006-M-PINK` |
| 7 | GMS-007 | Gamis Polos Daily | Dress | 95.000 | 175.000 | S/M/L/XL × HITAM, MAROON, COKLAT — cth: `GMS-007-L-HITAM` |
| 8 | HJB-008 | Hijab Segiempat Voal | Hijab | 25.000 | 49.000 | ALL SIZE × HITAM, PUTIH, CREAM, NAVY — cth: `HJB-008-ALLSIZE-CREAM` |
| 9 | PSM-009 | Pashmina Ceruty Babydoll | Hijab | 30.000 | 59.000 | ALL SIZE × OLIVE, ABU, PINK, COKLAT — cth: `PSM-009-ALLSIZE-OLIVE` |
| 10 | BEL-010 | Belt Kulit Gesper Gold | Aksesoris | 20.000 | 45.000 | ALL SIZE × HITAM, COKLAT — cth: `BEL-010-ALLSIZE-HITAM` |

Tips:

- Set **Stok minimum** tiap varian (mis. 6 pcs untuk pakaian, 12 pcs untuk hijab)
  agar tabel **Stok Menipis** di Menu Laporan Butik terisi saat stok turun.
- Cara cek stok varian: buka Menu Produk → klik nama produk → lihat angka
  **Stok** di tiap baris varian.

### Isi stok awal (wajib per varian — tidak ada isi stok manual)

Stok awal TIDAK diisi lewat kolom angka di form produk. Stok hanya bertambah
lewat dokumen, selalu per varian (pilih Size/Warna di tiap baris):

- **Barang dari supplier:** Menu Goods Receipt → tombol **Terima Barang** →
  pilih PO → tiap baris pilih **Varian** (mis. `M / HITAM`) → isi Qty → tombol
  **Simpan**. Stok varian tersebut bertambah sesuai Qty.
- **Barang yang sudah ada di toko:** Menu Stock Opname → tombol **Buat Opname**
  → form **Tambah Item** → pilih **Produk**, lalu wajib pilih **Varian** →
  isi **Qty aktual** → tombol **Tambah Item** → tombol **Posting Opname**. Produk yang
  punya varian TIDAK bisa diopname di level induk (tanpa pilih varian) —
  sistem menolak dengan pesan "pilih varian", jadi angka induk tidak dobel.

## 4. Customer UMUM

Buat via menu **Customer** satu entitas:

- **Nama:** `UMUM`
- **Telepon / alamat:** isi `-` bila tidak ada
- Dipakai sebagai customer default untuk transaksi **Kasir (/pos)** walk-in
  tanpa perlu input data pembeli tiap struk.

## 5. Akun Kas (Finance)

Pastikan via **Chart of Accounts** + **Kas & Bank** tersedia minimal:

| Kode | Nama | Kegunaan |
| --- | --- | --- |
| 1110 | Kas Toko | Kas fisik / laci kasir (default Kasir) |
| 1120 | Bank BCA | Transfer / QRIS |

Transaksi kasir tunai masuk ke **Kas Toko**; cocokkan saldo fisik dengan
laporan **Arus Kas** tiap tutup toko.

## 6. Alur Harian Kasir (ringkas)

1. Buka **Kasir (/pos)** → pilih customer `UMUM` → scan/pilih varian (SKU).
2. Posting invoice (langsung lunas) → omzet tercatat di **Laporan Butik**.
3. Cek **Laporan Butik** (/reports/butik): omzet hari ini, terlaris per varian,
   stok menipis per varian, margin periode.
4. Cek kartu **Omzet Hari Ini** + **Stok Varian Menipis** di **Dashboard**.
