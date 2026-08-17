# Skema Database — ERP Retail (Single Lokasi)

**Status**: Draft v1 · **Tanggal**: 15 Agustus 2026 · **Stack**: Appwrite (Database, Auth, Functions, Storage)

Dokumen ini adalah satu-satunya sumber kebenaran untuk struktur collection, attribute, index, dan permission. Perubahan skema WAJIB direfleksikan balik ke dokumen ini pada perubahan yang sama (lihat `CLAUDE.md` non-negotiable #3).

---

## 1. Konvensi Umum

### 1.1 Penamaan & tipe field

- Nama field `snake_case`.
- Primary key = `$id` bawaan Appwrite (string, 36 karakter).
- Foreign key disimpan **manual sebagai string ID Appwrite Document** — bukan native Relationship attribute (keputusan arsitektur, masih eksperimental di Appwrite).
- Timestamp (`created_at`, `updated_at`, `posted_at`, dll) disimpan sebagai **string ISO 8601 UTC** — konsisten & mudah di-sort lintas client/server.
- Field tanggal transaksi (`order_date`, `invoice_date`, `received_date`, `payment_date`, dsb) disimpan sebagai **string `YYYY-MM-DD`**.
- Field boolean Appwrite default `false`; field numerik default `0`.
- Enum disimpan sebagai string; nilainya ditulis di bagian "Enum" tiap collection.

### 1.2 Standar field audit (FR-CORE-02)

Semua collection transaksional wajib punya:
- `created_by` — string, ID user Appwrite Auth yang membuat dokumen (untuk dokumen yang dibuat Function: diisi ID user pemicu; untuk jurnal sistem: `system`).
- `created_at` — ISO 8601 UTC.

Collection yang bisa diubah/diposting menambahkan `updated_by`, `updated_at`, dan untuk aksi posting: `posted_by`, `posted_at`.

### 1.3 Penulisan data kritikal

- `stock_movements` dan `journal_entries` **hanya** ditulis lewat Appwrite Function (server-side, API key) — tidak pernah langsung dari client atau Server Action biasa.
- Setiap `journal_entries` wajib lolos validasi total debit = total kredit sebelum disimpan.
- `current_stock` di `products` adalah field denormalisasi — satu-satunya penulis adalah Function yang mencatat `stock_movements`. Client read-only.

### 1.4 Referensi transaksi (source/audit trail)

Field `source_type` + `source_id` dipakai untuk melacak asal sebuah `stock_movements`/`journal_entries`/`cash_bank_transactions`. Format `source_type` mengikuti nilai enum pada tabel di bawah:

| source_type | source_id merujuk ke |
|---|---|
| `goods_receipt` | dokumen `goods_receipts` |
| `sales_invoice` | dokumen `sales_invoices` |
| `purchase_return` | dokumen `purchase_returns` |
| `sales_return` | dokumen `sales_returns` |
| `stock_opname` | dokumen `stock_opnames` |
| `manual_adjustment` | dokumen pemicu (bisa kosong) |
| `sales_payment` | dokumen `sales_payments` |
| `payroll_run` | dokumen `payroll_runs` |
| `manual_transaction` | dokumen `cash_bank_transactions` |

---

## 2. Modul Core

### 2.1 `user_profiles` — profil user aplikasi

Profil setiap user Auth. Membantu UI & Server Action menentukan role user tanpa parsing Teams.

| Field | Tipe | Keterangan |
|---|---|---|
| `user_id` | string | FK → user Appwrite Auth ($id). **Unique index.** |
| `full_name` | string | Nama lengkap |
| `role` | string enum | `admin` · `warehouse` · `purchasing` · `sales` · `finance` · `hr` |
| `team_ids` | array<string> | Daftar ID Appwrite Team tempat user tergabung (denormalisasi untuk query cepat) |
| `is_active` | boolean | Menonaktifkan akses user |
| `created_by` | string | Audit |
| `created_at` | string | ISO 8601 UTC |
| `updated_by` | string | Audit |
| `updated_at` | string | ISO 8601 UTC |

**Index**: `user_id` (unique), `role`.

**Permission**:
- Read: user itu sendiri (`read:user:`); admin (read semua).
- Write: admin (create/update/delete).

**Catatan**: `role` di sini adalah role utama user. Untuk role sekunder / akses lintas, gunakan Team membership Appwrite (lihat Strategi Permission §6).

---

## 3. Modul Inventory

### 3.1 `product_categories` — kategori produk

| Field | Tipe | Keterangan |
|---|---|---|
| `name` | string | Nama kategori |
| `description` | string | Opsional |
| `is_active` | boolean | |
| `created_by` | string | Audit |
| `created_at` | string | |
| `updated_by` | string | |
| `updated_at` | string | |

**Permission**: Read: `admin`, `warehouse`, `purchasing`, `sales`, `finance`. Write: `admin`, `warehouse`.

### 3.2 `products` — master produk

| Field | Tipe | Keterangan |
|---|---|---|
| `sku` | string | **Unique index** — sistem menolak duplikat |
| `name` | string | |
| `barcode` | string | Opsional, unik bila diisi |
| `category_id` | string | FK → `product_categories.$id` |
| `unit` | string | Satuan (pcs, box, kg, dll) |
| `cost_price` | number | Harga beli/pokok |
| `sell_price` | number | Harga jual |
| `min_stock` | number | Ambang alert stok rendah |
| `current_stock` | number | **Denormalisasi** — sinkron dari akumulasi `stock_movements`; hanya ditulis Function |
| `is_active` | boolean | Produk yang pernah bertransaksi tidak bisa dihapus permanen, hanya dinonaktifkan |
| `created_by` | string | Audit |
| `created_at` | string | |
| `updated_by` | string | |
| `updated_at` | string | |

**Index**: `sku` (unique), `barcode` (unique, nilai kosong/null tidak memicu bentrok), `category_id`, `is_active`.

**Permission**: Read: `admin`, `warehouse`, `purchasing`, `sales`, `finance`. Write: `admin`, `warehouse`.

### 3.3 `stock_movements` — riwayat mutasi stok (write hanya via Function)

| Field | Tipe | Keterangan |
|---|---|---|
| `product_id` | string | FK → `products.$id` |
| `movement_type` | string enum | `goods_receipt` · `sales_invoice` · `purchase_return` · `sales_return` · `stock_opname` · `manual_adjustment` |
| `quantity_delta` | number | **Bertanda**: positif = stok masuk, negatif = stok keluar |
| `source_type` | string | Lihat §1.4 |
| `source_id` | string | FK manual → dokumen sumber |
| `note` | string | Opsional |
| `created_by` | string | ID user pemicu (bisa `system`) |
| `created_at` | string | |

**Index**: `product_id` (+`created_at`), `source_type` + `source_id`.

**Permission**: Read: `admin`, `warehouse`, `finance`. Write: **tidak ada role** — hanya Appwrite Function dengan API key.

### 3.4 `stock_opnames` — dokumen opname (stock count)

| Field | Tipe | Keterangan |
|---|---|---|
| `opname_number` | string | Nomor dokumen, unik |
| `opname_date` | string | `YYYY-MM-DD` |
| `status` | string enum | `draft` · `posted` · `cancelled` |
| `note` | string | |
| `created_by` | string | |
| `created_at` | string | |
| `posted_by` | string | |
| `posted_at` | string | |

**Permission**: Read: `admin`, `warehouse`. Write: `admin`, `warehouse`.

### 3.5 `stock_opname_items` — item hasil hitung fisik

| Field | Tipe | Keterangan |
|---|---|---|
| `stock_opname_id` | string | FK → `stock_opnames.$id` |
| `product_id` | string | FK → `products.$id` |
| `system_qty` | number | Stok menurut sistem saat opname dibuat |
| `actual_qty` | number | Hasil hitung fisik |
| `difference` | number | `actual_qty - system_qty` (selisih positif/negatif) |
| `note` | string | |

**Index**: `stock_opname_id`, `product_id`.

**Permission**: sama dengan `stock_opnames`.

---

## 4. Modul Purchasing

### 4.1 `suppliers` — master supplier

| Field | Tipe | Keterangan |
|---|---|---|
| `code` | string | Kode supplier, unik |
| `name` | string | |
| `contact_person` | string | |
| `phone` | string | |
| `email` | string | |
| `address` | string | |
| `payment_terms` | string | Misal `net30`, `cod` |
| `is_active` | boolean | |
| `created_by` / `created_at` / `updated_by` / `updated_at` | | Audit |

**Index**: `code` (unique).

**Permission**: Read: `admin`, `purchasing`, `finance`, `warehouse`. Write: `admin`, `purchasing`.

### 4.2 `purchase_orders` — Purchase Order

| Field | Tipe | Keterangan |
|---|---|---|
| `po_number` | string | Nomor PO, unik |
| `supplier_id` | string | FK → `suppliers.$id` |
| `order_date` | string | `YYYY-MM-DD` |
| `expected_date` | string | Opsional |
| `status` | string enum | `draft` · `ordered` · `partial` · `received` · `cancelled` |
| `total_amount` | number | Jumlah semua item |
| `notes` | string | |
| `created_by` / `created_at` / `updated_by` / `updated_at` | | Audit |

**Index**: `po_number` (unique), `supplier_id`, `status`.

**Permission**: Read: `admin`, `purchasing`, `warehouse`, `finance`. Write: `admin`, `purchasing`.

### 4.3 `purchase_order_items`

| Field | Tipe | Keterangan |
|---|---|---|
| `purchase_order_id` | string | FK → `purchase_orders.$id` |
| `product_id` | string | FK → `products.$id` |
| `quantity` | number | Qty order |
| `unit_price` | number | Harga per unit |
| `line_total` | number | `quantity * unit_price` |

**Index**: `purchase_order_id`, `product_id`.

**Permission**: sama dengan `purchase_orders`.

### 4.4 `goods_receipts` — penerimaan barang

| Field | Tipe | Keterangan |
|---|---|---|
| `gr_number` | string | Nomor GR, unik |
| `purchase_order_id` | string | FK → `purchase_orders.$id` |
| `received_date` | string | `YYYY-MM-DD` |
| `status` | string enum | `draft` · `posted` · `cancelled` |
| `notes` | string | |
| `created_by` / `created_at` | | Audit |
| `posted_by` / `posted_at` | | |

**Index**: `gr_number` (unique), `purchase_order_id`, `status`.

**Permission**: Read: `admin`, `warehouse`, `purchasing`, `finance`. Write: `admin`, `warehouse`.

### 4.5 `goods_receipt_items`

| Field | Tipe | Keterangan |
|---|---|---|
| `goods_receipt_id` | string | FK → `goods_receipts.$id` |
| `purchase_order_item_id` | string | FK → `purchase_order_items.$id` |
| `product_id` | string | FK → `products.$id` |
| `quantity_received` | number | Tidak boleh melebihi qty PO (validasi di Function) |

**Index**: `goods_receipt_id`, `purchase_order_item_id`.

**Permission**: sama dengan `goods_receipts`.

### 4.6 `purchase_returns` — retur pembelian

| Field | Tipe | Keterangan |
|---|---|---|
| `return_number` | string | Unik |
| `supplier_id` | string | FK → `suppliers.$id` |
| `purchase_order_id` | string | FK opsional |
| `return_date` | string | `YYYY-MM-DD` |
| `status` | string enum | `draft` · `posted` · `cancelled` |
| `notes` | string | |
| `created_by` / `created_at` | | |
| `posted_by` / `posted_at` | | |

**Permission**: Read: `admin`, `purchasing`, `finance`. Write: `admin`, `purchasing`.

### 4.7 `purchase_return_items`

| Field | Tipe | Keterangan |
|---|---|---|
| `purchase_return_id` | string | FK → `purchase_returns.$id` |
| `product_id` | string | FK → `products.$id` |
| `quantity` | number | Qty retur |
| `unit_price` | number | Harga satuan saat retur |

**Index**: `purchase_return_id`, `product_id`.

**Permission**: sama dengan `purchase_returns`.

---

## 5. Modul Sales

### 5.1 `customers` — master customer

| Field | Tipe | Keterangan |
|---|---|---|
| `code` | string | Unik |
| `name` | string | |
| `contact_person` | string | |
| `phone` | string | |
| `email` | string | |
| `address` | string | |
| `credit_limit` | number | Batas kredit piutang |
| `is_active` | boolean | |
| `created_by` / `created_at` / `updated_by` / `updated_at` | | Audit |

**Index**: `code` (unique).

**Permission**: Read: `admin`, `sales`, `finance`. Write: `admin`, `sales`.

### 5.2 `sales_orders` — Sales Order

| Field | Tipe | Keterangan |
|---|---|---|
| `so_number` | string | Unik |
| `customer_id` | string | FK → `customers.$id` |
| `order_date` | string | `YYYY-MM-DD` |
| `expected_date` | string | Opsional |
| `status` | string enum | `draft` · `confirmed` · `partially_invoiced` · `invoiced` · `cancelled` |
| `total_amount` | number | |
| `notes` | string | |
| `created_by` / `created_at` / `updated_by` / `updated_at` | | Audit |

**Index**: `so_number` (unique), `customer_id`, `status`.

**Permission**: Read: `admin`, `sales`, `finance`, `warehouse`. Write: `admin`, `sales`.

### 5.3 `sales_order_items`

| Field | Tipe | Keterangan |
|---|---|---|
| `sales_order_id` | string | FK → `sales_orders.$id` |
| `product_id` | string | FK → `products.$id` |
| `quantity` | number | |
| `unit_price` | number | |
| `line_total` | number | |

**Index**: `sales_order_id`, `product_id`.

**Permission**: sama dengan `sales_orders`.

### 5.4 `sales_invoices` — invoice penjualan

| Field | Tipe | Keterangan |
|---|---|---|
| `invoice_number` | string | Unik |
| `sales_order_id` | string | FK → `sales_orders.$id` |
| `customer_id` | string | FK → `customers.$id` |
| `invoice_date` | string | `YYYY-MM-DD` |
| `due_date` | string | |
| `subtotal` | number | |
| `discount` | number | |
| `tax` | number | |
| `total_amount` | number | `subtotal - discount + tax` |
| `status` | string enum | `unpaid` · `partial` · `paid` · `cancelled` — status sinkron dengan total pembayaran |
| `stock_override` | boolean | True bila invoice dipaksa terbit meski stok kurang (role berwenang) |
| `override_by` | string | ID user yang memberikan override |
| `override_note` | string | Alasan override |
| `created_by` / `created_at` | | |
| `posted_by` / `posted_at` | | |

**Index**: `invoice_number` (unique), `sales_order_id`, `customer_id`, `status`.

**Permission**: Read: `admin`, `sales`, `finance`. Write: `admin`, `sales`.

### 5.5 `sales_invoice_items`

| Field | Tipe | Keterangan |
|---|---|---|
| `sales_invoice_id` | string | FK → `sales_invoices.$id` |
| `sales_order_item_id` | string | FK opsional |
| `product_id` | string | FK → `products.$id` |
| `quantity` | number | |
| `unit_price` | number | |
| `line_total` | number | |

**Index**: `sales_invoice_id`, `product_id`.

**Permission**: sama dengan `sales_invoices`.

### 5.6 `sales_payments` — pembayaran invoice

| Field | Tipe | Keterangan |
|---|---|---|
| `invoice_id` | string | FK → `sales_invoices.$id` |
| `customer_id` | string | FK → `customers.$id` |
| `payment_date` | string | `YYYY-MM-DD` |
| `amount` | number | Boleh cicil/partial |
| `method` | string enum | `cash` · `bank_transfer` · `other` |
| `cash_bank_account_id` | string | FK → `cash_bank_accounts.$id` |
| `reference` | string | No referensi/bukti |
| `notes` | string | |
| `created_by` / `created_at` | | Audit |

**Index**: `invoice_id`, `payment_date`.

**Permission**: Read: `admin`, `sales`, `finance`. Write: `admin`, `sales`, `finance`.

### 5.7 `sales_returns` — retur penjualan

| Field | Tipe | Keterangan |
|---|---|---|
| `return_number` | string | Unik |
| `sales_invoice_id` | string | FK → `sales_invoices.$id` |
| `customer_id` | string | FK → `customers.$id` |
| `return_date` | string | `YYYY-MM-DD` |
| `status` | string enum | `draft` · `posted` · `cancelled` |
| `notes` | string | |
| `created_by` / `created_at` | | |
| `posted_by` / `posted_at` | | |

**Permission**: Read: `admin`, `sales`, `finance`. Write: `admin`, `sales`.

### 5.8 `sales_return_items`

| Field | Tipe | Keterangan |
|---|---|---|
| `sales_return_id` | string | FK → `sales_returns.$id` |
| `sales_invoice_item_id` | string | FK opsional |
| `product_id` | string | FK → `products.$id` |
| `quantity` | number | |
| `unit_price` | number | |

**Index**: `sales_return_id`, `product_id`.

**Permission**: sama dengan `sales_returns`.

---

## 6. Modul Finance & Akuntansi

### 6.1 `chart_of_accounts` — COA

| Field | Tipe | Keterangan |
|---|---|---|
| `code` | string | Kode akun, unik |
| `name` | string | |
| `account_type` | string enum | `asset` · `liability` · `equity` · `revenue` · `expense` |
| `parent_account_id` | string | FK opsional → `chart_of_accounts.$id` |
| `is_active` | boolean | |
| `created_by` / `created_at` / `updated_by` / `updated_at` | | Audit |

**Index**: `code` (unique), `account_type`.

**Permission**: Read: `admin`, `finance`. Write: `admin`, `finance`.

### 6.2 `journal_entries` — header jurnal (write hanya via Function)

| Field | Tipe | Keterangan |
|---|---|---|
| `entry_number` | string | Unik |
| `entry_date` | string | `YYYY-MM-DD` |
| `source_type` | string | Lihat §1.4 |
| `source_id` | string | FK manual → dokumen sumber |
| `description` | string | |
| `total_debit` | number | **Harus sama dengan `total_credit`** |
| `total_credit` | number | |
| `status` | string enum | `posted` · `reversed` |
| `reversed_by_entry_id` | string | FK opsional → `journal_entries.$id` (entry reversal) |
| `reversed_at` | string | |
| `created_by` | string | `system` untuk jurnal otomatis, ID user untuk jurnal reversal |
| `created_at` | string | |

**Index**: `entry_number` (unique), `entry_date`, `source_type` + `source_id`.

**Permission**: Read: `admin`, `finance`. Write: **tidak ada role** — hanya Appwrite Function. Jurnal otomatis tidak bisa diedit langsung, hanya dibalik (reversal).

### 6.3 `journal_entry_lines` — detail jurnal

| Field | Tipe | Keterangan |
|---|---|---|
| `journal_entry_id` | string | FK → `journal_entries.$id` |
| `account_id` | string | FK → `chart_of_accounts.$id` |
| `debit` | number | Salah satu debit/kredit harus 0 |
| `credit` | number | |
| `description` | string | |

**Index**: `journal_entry_id`, `account_id` (+`entry_date` via join), `debit`, `credit`.

**Permission**: sama dengan `journal_entries`.

### 6.4 `cash_bank_accounts` — akun kas & bank

| Field | Tipe | Keterangan |
|---|---|---|
| `name` | string | Misal `Kas Besar`, `Bank BCA` |
| `account_type` | string enum | `cash` · `bank` |
| `bank_name` | string | Opsional |
| `account_number` | string | Opsional |
| `opening_balance` | number | Saldo awal |
| `is_active` | boolean | |
| `created_at` | string | |

**Permission**: Read: `admin`, `finance`, `sales`. Write: `admin`, `finance`.

### 6.5 `cash_bank_transactions` — mutasi kas/bank

| Field | Tipe | Keterangan |
|---|---|---|
| `cash_bank_account_id` | string | FK → `cash_bank_accounts.$id` |
| `transaction_date` | string | `YYYY-MM-DD` |
| `transaction_type` | string enum | `in` · `out` |
| `amount` | number | |
| `source_type` | string | Lihat §1.4 |
| `source_id` | string | |
| `description` | string | |
| `created_by` / `created_at` | | Audit |

**Index**: `cash_bank_account_id`, `transaction_date`.

**Permission**: Read: `admin`, `finance`, `sales`. Write: `admin`, `finance`.

---

## 7. Modul HR & Payroll

### 7.1 `employees` — master karyawan

| Field | Tipe | Keterangan |
|---|---|---|
| `employee_number` | string | Unik |
| `user_id` | string | FK opsional → user Appwrite Auth (untuk login karyawan) |
| `full_name` | string | |
| `position` | string | Jabatan |
| `basic_salary` | number | Gaji pokok |
| `hire_date` | string | `YYYY-MM-DD` |
| `status` | string enum | `active` · `resigned` |
| `phone` | string | |
| `address` | string | |
| `created_by` / `created_at` / `updated_by` / `updated_at` | | Audit |

**Index**: `employee_number` (unique), `user_id`, `status`.

**Permission**: Read: `admin`, `hr`, `finance`. Write: `admin`, `hr`.

### 7.2 `salary_components` — komponen gaji per karyawan

| Field | Tipe | Keterangan |
|---|---|---|
| `employee_id` | string | FK → `employees.$id` |
| `component_type` | string enum | `allowance` · `deduction` |
| `name` | string | Misal `Tunjangan Makan`, `Potongan BPJS` |
| `amount` | number | |
| `is_active` | boolean | |
| `created_at` | string | |

**Index**: `employee_id`.

**Permission**: Read: `admin`, `hr`, `finance`. Write: `admin`, `hr`.

### 7.3 `payroll_runs` — proses payroll per periode

| Field | Tipe | Keterangan |
|---|---|---|
| `payroll_number` | string | Unik |
| `period` | string | Format `YYYY-MM` — satu run per periode |
| `run_date` | string | `YYYY-MM-DD` |
| `status` | string enum | `draft` · `posted` · `cancelled` |
| `total_gross` | number | |
| `total_deduction` | number | |
| `total_net` | number | |
| `created_by` / `created_at` | | |
| `posted_by` / `posted_at` | | |

**Index**: `period` (unique untuk status `posted`/`draft` aktif — dicek di Function), `status`.

**Permission**: Read: `admin`, `hr`, `finance`. Write: `admin`, `hr`.

### 7.4 `payroll_details` — detail per karyawan

| Field | Tipe | Keterangan |
|---|---|---|
| `payroll_run_id` | string | FK → `payroll_runs.$id` |
| `employee_id` | string | FK → `employees.$id` |
| `basic_salary` | number | |
| `total_allowance` | number | |
| `total_deduction` | number | |
| `net_salary` | number | `basic_salary + allowance - deduction` |

**Index**: `payroll_run_id` + `employee_id` (**unique compound** — mencegah karyawan muncul dua kali dalam satu periode).

**Permission**: Read: `admin`, `hr`, `finance`. **HR lain / non-finance / non-admin: dilarang** (FR-CORE-01 AC). Write: `admin`, `hr`.

---

## 8. Strategi Permission per Role

### 8.1 Pendekatan

- **Appwrite 1.9.x sudah menghapus prefix `role:` custom** — digantikan **Labels**. Setiap role ERP adalah label: `admin`, `warehouse`, `purchasing`, `sales`, `finance`, `hr`. Label dipasang ke user via `users.updateLabels({ userId, labels: [role] })`.
- RBAC tetap berbasis **Appwrite Teams** untuk struktur keanggotaan: enam team tetap (`admin`, `warehouse`, `purchasing`, `sales`, `finance`, `hr`). Setiap user masuk ke team sesuai rolenya.
- Permission collection memakai label: `Permission.read(Role.label("admin"))` → string `read("label:admin")`. Satu user bisa punya >1 label bila diberi akses lintas modul.
- Write ke collection kritikal (`stock_movements`, `journal_entries`) **tidak diberikan ke label mana pun**; satu-satunya jalur adalah Appwrite Function (API key server). Client dan Server Action biasa hanya bisa menulis dokumen transaksional (PO, invoice, dsb) pada status `draft`; aksi posting yang menyentuh stok/jurnal selalu melalui Function.
- UI/Sidebar menyaring menu berdasarkan role user (lihat `user_profiles.role`), dan middleware route memblokir akses langsung ke URL role lain.

### 8.2 Matriks permission per collection

Legenda: **R** = read · **W** = write (create/update) · **P** = post (transisi status draft→posted) · **—** = tidak ada akses · **F** = write khusus Appwrite Function

> Permission diimplementasikan sebagai **label** (`label:admin`, dst), bukan `role:`. Kolom header di bawah = label Appwrite yang diberi akses.

| Collection | admin | warehouse | purchasing | sales | finance | hr |
|---|---|---|---|---|---|---|
| `user_profiles` | RW | R (self) | R (self) | R (self) | R (self) | R (self) |
| `product_categories` | RW | RW | R | R | R | — |
| `products` | RW | RW | R | R | R | — |
| `stock_movements` | R | R | — | — | R | — |
| `stock_opnames` (+ items) | RW | RW/P | — | — | — | — |
| `suppliers` | RW | R | RW | — | R | — |
| `purchase_orders` (+ items) | RW | R | RW | — | R | — |
| `goods_receipts` (+ items) | RW | RW/P | R | — | R | — |
| `purchase_returns` (+ items) | RW | — | RW/P | — | R | — |
| `customers` | RW | — | — | RW | R | — |
| `sales_orders` (+ items) | RW | R | — | RW | R | — |
| `sales_invoices` (+ items) | RW | — | — | RW/P | R | — |
| `sales_payments` | RW | — | — | RW | RW | — |
| `sales_returns` (+ items) | RW | — | — | RW/P | R | — |
| `chart_of_accounts` | RW | — | — | — | RW | — |
| `journal_entries` (+ lines) | R | — | — | — | R | — |
| `cash_bank_accounts` | RW | — | — | R | RW | — |
| `cash_bank_transactions` | RW | — | — | R | RW | — |
| `employees` | RW | — | — | — | R | RW |
| `salary_components` | RW | — | — | — | R | RW |
| `payroll_runs` | RW | — | — | — | R | RW |
| `payroll_details` | RW | — | — | — | R | RW |
| `stock_movements` *write* | **F** | **F** | **F** | **F** | **F** | **F** |
| `journal_entries` *write* | **F** | **F** | **F** | **F** | **F** | **F** |

### 8.3 Aturan tambahan

1. **FR-CORE-01 AC**: staf non-finance/non-admin tidak bisa melihat detail gaji karyawan lain → `payroll_details`, `salary_components`, dan `employees.basic_salary` hanya bisa dibaca `admin`, `hr`, `finance`.
2. **Overdue piutang/limit kredit**: `credit_limit` customer hanya writable oleh `admin` dan `sales`.
3. **Override stok negatif** (FR-SAL-02): hanya `admin` dan `sales` yang bisa memberi `stock_override` pada `sales_invoices`.
4. Semua collection transaksional wajib mengisi `created_by` (FR-CORE-02).

---

## 9. Perubahan vs PRD

Perubahan yang dicatat di dokumen ini saat disusun (15 Agustus 2026):
- Field `stock_override`/`override_by`/`override_note` di `sales_invoices` ditambahkan untuk mengakomodasi AC FR-SAL-02 ("kecuali override eksplisit oleh role berwenang") yang tidak tersedia di draft PRD.
- `team_ids` di `user_profiles` adalah denormalisasi untuk query cepat; source of truth tetap Appwrite Team membership.
- Enum `movement_type` dan `source_type` diseragamkan (lihat §1.4) supaya satu label dipakai lintas modul.
