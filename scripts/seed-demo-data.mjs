// Seed data demo ERP Retail — konsisten dengan alur program.
// Semua transaksi dibuat dengan struktur field yang sama seperti server action di src/lib,
// lalu diposting lewat Appwrite Function "post-stock-opname" (jalur yang sama dengan aplikasi).
//
// Jalankan: node scripts/seed-demo-data.mjs
// PERINGATAN: menghapus data transaksional + master dagang sebelum mengisi ulang.

import { readFileSync } from "node:fs";
import { Client, Databases, Functions, ID, Query } from "node-appwrite";

const raw = readFileSync(".env.local", "utf8");
const get = (name) => raw.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim();

const client = new Client()
  .setEndpoint(get("NEXT_PUBLIC_APPWRITE_ENDPOINT"))
  .setProject(get("NEXT_PUBLIC_APPWRITE_PROJECT_ID"))
  .setKey(get("APPWRITE_API_KEY"));
const db = new Databases(client);
const functions = new Functions(client);
const DB = "erp";
const USER = "seed-demo";

// ── Tanggal relatif (T = hari ini) ─────────────────────────────────────
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const iso = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
};
const compact = (date) => date.replaceAll("-", "");
const addDays = (date, n) => {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// ── Helper ─────────────────────────────────────────────────────────────
async function wipe(collection) {
  for (;;) {
    const r = await db.listDocuments(DB, collection, [Query.limit(100)]);
    if (r.documents.length === 0) break;
    for (const doc of r.documents) {
      await db.deleteDocument(DB, collection, doc.$id);
    }
  }
  console.log(`[wipe] ${collection}`);
}

async function create(collection, data) {
  return db.createDocument(DB, collection, ID.unique(), data);
}

async function fnPost(payload, label) {
  const run = await functions.createExecution({
    functionId: "post-stock-opname",
    body: JSON.stringify(payload),
    async: false,
  });
  const status = run.responseStatusCode;
  let body = {};
  try {
    body = JSON.parse(run.responseBody ?? "{}");
  } catch {}
  if (status !== 200 || !body.ok) {
    throw new Error(`Function gagal (${label}): HTTP ${status} ${JSON.stringify(body)}`);
  }
  console.log(`[posted] ${label}`);
  return body;
}

const rupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID");

// ── 1. Bersihkan data ──────────────────────────────────────────────────
console.log("=== Menghapus data lama ===");
for (const c of [
  "journal_entry_lines",
  "journal_entries",
  "stock_movements",
  "sales_payments",
  "sales_invoice_items",
  "sales_invoices",
  "sales_order_items",
  "sales_orders",
  "sales_return_items",
  "sales_returns",
  "purchase_return_items",
  "purchase_returns",
  "goods_receipt_items",
  "goods_receipts",
  "purchase_order_items",
  "purchase_orders",
  "stock_opname_items",
  "stock_opnames",
  "payroll_details",
  "payroll_runs",
  "cash_bank_transactions",
  "cash_bank_accounts",
  "products",
  "product_categories",
  "customers",
  "suppliers",
  "salary_components",
  "employees",
]) {
  await wipe(c);
}

// ── 2. Master: kategori & produk ───────────────────────────────────────
console.log("=== Master data ===");
const catData = [
  ["Minuman", "Air mineral, teh, kopi, susu"],
  ["Makanan Instan", "Mie instan dan makanan siap saji"],
  ["Bumbu & Sembako", "Beras, minyak, gula, bumbu dapur"],
  ["Perawatan Diri", "Sabun, sampo, produk kebersihan pribadi"],
  ["Kebutuhan Rumah", "Deterjen, pembersih, kebutuhan rumah tangga"],
];
const cats = {};
for (const [name, description] of catData) {
  const doc = await create("product_categories", { name, description, is_active: true, created_by: USER, created_at: iso(-25) });
  cats[name] = doc.$id;
}

const productData = [
  ["SKU-IMI2", "Indomie Goreng", "Makanan Instan", "pcs", 2800, 3500, 50],
  ["SKU-AQU6", "Aqua Botol 600ml", "Minuman", "pcs", 2500, 4000, 40],
  ["SKU-TBTB", "Teh Botol Sosro 350ml", "Minuman", "botol", 3800, 5000, 30],
  ["SKU-KPA1", "Kopi Kapal Api Special 165g", "Minuman", "box", 18000, 23000, 15],
  ["SKU-BRS5", "Beras Pandan Wangi 5kg", "Bumbu & Sembako", "sak", 68000, 82000, 20],
  ["SKU-MNY1", "Minyak Goreng Sania 1L", "Bumbu & Sembako", "botol", 17500, 21000, 25],
  ["SKU-GUL1", "Gula Pasir Gulaku 1kg", "Bumbu & Sembako", "pak", 16000, 19000, 20],
  ["SKU-LSB1", "Sabun Lifebuoy 110g", "Perawatan Diri", "pcs", 3800, 5000, 30],
  ["SKU-RNS1", "Deterjen Rinso 800g", "Kebutuhan Rumah", "pak", 18500, 23000, 15],
  ["SKU-ULT6", "Susu Ultra Cokelat 250ml", "Minuman", "pcs", 5200, 6500, 25],
];
const products = {};
for (const [sku, name, cat, unit, cost, sell, min] of productData) {
  const doc = await create("products", {
    sku, name, barcode: null, category_id: cats[cat], unit,
    cost_price: cost, sell_price: sell, min_stock: min,
    current_stock: 0, is_active: true, created_by: USER, created_at: iso(-24),
  });
  products[sku] = { id: doc.$id, cost, sell };
}
console.log(`[ok] ${productData.length} produk`);

// ── 3. Master: supplier & customer ─────────────────────────────────────
const supplierData = [
  ["SUP-001", "PT Indofood Sukses Makmur", "Hendra Wijaya", "021-5551001", "sales@indofood.co.id", "Jl. Sudirman Kav. 76-78, Jakarta", "Net 30"],
  ["SUP-002", "CV Sumber Pangan Nusantara", "Bambang Sutrisno", "022-5552002", "order@sumberpangan.id", "Jl. Asia Afrika No. 21, Bandung", "Net 14"],
  ["SUP-003", "PT Mayora Indah", "Sari Kusuma", "021-5553003", "cs@mayora.com", "Jl. Daan Mogot KM 18, Jakarta", "Net 30"],
];
const suppliers = {};
for (const [code, name, contact, phone, email, address, terms] of supplierData) {
  const doc = await create("suppliers", { code, name, contact_person: contact, phone, email, address, payment_terms: terms, is_active: true, created_by: USER, created_at: iso(-24) });
  suppliers[code] = doc.$id;
}

const customerData = [
  ["CUS-001", "Warung Bu Sari", "Sari Wulandari", "0812-3456-7801", null, "Jl. Kenanga No. 5", 2000000],
  ["CUS-002", "Toko Kelontong Jaya", "Joko Prasetyo", "0812-3456-7802", null, "Jl. Melati No. 12", 5000000],
  ["CUS-003", "Kantin SMA Harapan", "Ibu Ratna", "0812-3456-7803", null, "Jl. Pendidikan No. 3", 3000000],
  ["CUS-004", "Cafe Kopi Senja", "Dimas Anggara", "0812-3456-7804", "kopisenja@mail.com", "Jl. Cendana No. 8", 4000000],
];
const customers = {};
for (const [code, name, contact, phone, email, address, limit] of customerData) {
  const doc = await create("customers", { code, name, contact_person: contact, phone, email, address, credit_limit: limit, is_active: true, created_by: USER, created_at: iso(-24) });
  customers[code] = doc.$id;
}
console.log("[ok] supplier & customer");

// ── 4. Kas & bank + setoran modal ──────────────────────────────────────
const kasBesar = await create("cash_bank_accounts", {
  name: "Kas Besar", account_type: "cash", bank_name: null, account_number: null,
  opening_balance: 0, is_active: true, coa_account_id: null, created_by: USER, created_at: iso(-25),
});
const bankBca = await create("cash_bank_accounts", {
  name: "BCA Operasional", account_type: "bank", bank_name: "BCA", account_number: "5410-123-456",
  opening_balance: 0, is_active: true, coa_account_id: null, created_by: USER, created_at: iso(-25),
});
for (const [acct, amount, desc] of [
  [kasBesar.$id, 30000000, "Setoran modal tunai pemilik"],
  [bankBca.$id, 20000000, "Setoran modal awal via transfer"],
]) {
  await create("cash_bank_transactions", {
    cash_bank_account_id: acct, transaction_date: day(-25), transaction_type: "in",
    amount, source_type: "", source_id: "", description: desc, created_by: USER, created_at: iso(-25),
  });
}
console.log("[ok] kas & bank (modal Rp 50.000.000)");

// ── 5. Karyawan + komponen gaji ────────────────────────────────────────
const employeeData = [
  ["EMP-001", "Budi Santoso", "Pemilik & Manajer Toko", 8000000, "2021-01-05", "0813-1111-0001"],
  ["EMP-002", "Siti Rahayu", "Staff Gudang", 4500000, "2022-03-01", "0813-1111-0002"],
  ["EMP-003", "Andi Wijaya", "Kasir", 4000000, "2023-06-10", "0813-1111-0003"],
  ["EMP-004", "Dewi Lestari", "Sales Toko", 4000000, "2023-09-01", "0813-1111-0004"],
  ["EMP-005", "Rudi Hartono", "Kurir", 3800000, "2024-02-15", "0813-1111-0005"],
];
const employees = {};
for (const [number, name, position, salary, hire, phone] of employeeData) {
  const doc = await create("employees", {
    employee_number: number, full_name: name, position, basic_salary: salary,
    hire_date: hire, phone, status: "active", address: null, user_id: null,
    created_by: USER, created_at: iso(-24),
  });
  employees[number] = doc.$id;
}
const componentData = [
  ["EMP-001", "allowance", "Tunjangan Jabatan", 1500000],
  ["EMP-002", "allowance", "Tunjangan Makan", 500000],
  ["EMP-002", "deduction", "BPJS Kesehatan", 180000],
  ["EMP-003", "allowance", "Tunjangan Transport", 400000],
  ["EMP-003", "deduction", "BPJS Kesehatan", 160000],
  ["EMP-004", "allowance", "Tunjangan Makan", 400000],
  ["EMP-004", "deduction", "BPJS Kesehatan", 160000],
  ["EMP-005", "deduction", "BPJS Kesehatan", 152000],
];
for (const [emp, type, name, amount] of componentData) {
  await create("salary_components", {
    employee_id: employees[emp], component_type: type, name, amount,
    is_active: true, created_at: iso(-24),
  });
}
console.log(`[ok] ${employeeData.length} karyawan`);

// ── 6. COA + jurnal setoran modal (D Kas / C Modal) ────────────────────
const coa = {};
{
  const r = await db.listDocuments(DB, "chart_of_accounts", [Query.limit(100)]);
  for (const a of r.documents) coa[a.code] = a;
}
const MODAL = 50000000;
{
  const je = await create("journal_entries", {
    entry_number: "JE-001", entry_date: day(-25), source_type: "manual", source_id: "",
    description: "Setoran modal pemilik", total_debit: MODAL, total_credit: MODAL,
    status: "posted", created_by: USER, created_at: iso(-25),
  });
  for (const [code, debit, credit] of [["1110", MODAL, 0], ["3100", 0, MODAL]]) {
    await create("journal_entry_lines", {
      journal_entry_id: je.$id, account_id: coa[code].$id,
      debit, credit, description: "Setoran modal pemilik",
    });
  }
  console.log("[posted] JE-001 Setoran modal " + rupiah(MODAL));
}

// ── 7. Pembelian: PO-001 → GR penuh ────────────────────────────────────
async function createPO(supplierCode, orderDate, items) {
  const poNumber = `PO-${compact(orderDate)}-001`;
  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const po = await create("purchase_orders", {
    po_number: poNumber, supplier_id: suppliers[supplierCode], order_date: orderDate,
    expected_date: addDays(orderDate, 5), status: "draft", total_amount: total,
    notes: null, created_by: USER, created_at: iso(0),
  });
  const itemIds = {};
  for (const it of items) {
    const doc = await create("purchase_order_items", {
      purchase_order_id: po.$id, product_id: products[it.sku].id,
      quantity: it.quantity, unit_price: it.unit_price, line_total: it.quantity * it.unit_price,
    });
    itemIds[it.sku] = doc.$id;
  }
  console.log(`[ok] ${poNumber} ${rupiah(total)}`);
  return { id: po.$id, po_number: poNumber, itemIds, total };
}

async function sendPO(po) {
  await db.updateDocument(DB, "purchase_orders", po.id, { status: "ordered", updated_by: USER, updated_at: iso(0) });
  console.log(`[sent] ${po.po_number} -> ordered`);
}

async function createAndPostGR(po, receivedDate, receives, notes) {
  const grNumber = `GR-${compact(receivedDate)}-001`;
  const gr = await create("goods_receipts", {
    gr_number: grNumber, purchase_order_id: po.id, received_date: receivedDate,
    status: "draft", notes: notes ?? null, created_by: USER, created_at: iso(0),
  });
  for (const [sku, qty] of receives) {
    await create("goods_receipt_items", {
      goods_receipt_id: gr.$id, purchase_order_item_id: po.itemIds[sku],
      product_id: products[sku].id, quantity_received: qty,
    });
  }
  await fnPost({ type: "goods_receipt", goods_receipt_id: gr.$id, created_by: USER }, `${grNumber} (${receives.length} item)`);
  return gr;
}

console.log("=== Alur pembelian ===");
const po1 = await createPO("SUP-001", day(-20), [
  { sku: "SKU-IMI2", quantity: 200, unit_price: 2800 },
  { sku: "SKU-AQU6", quantity: 240, unit_price: 2500 },
  { sku: "SKU-TBTB", quantity: 120, unit_price: 3800 },
  { sku: "SKU-RNS1", quantity: 40, unit_price: 18500 },
]);
await sendPO(po1);
await createAndPostGR(po1, day(-18), [["SKU-IMI2", 200], ["SKU-AQU6", 240], ["SKU-TBTB", 120], ["SKU-RNS1", 40]], "Barang lengkap, kondisi baik");

const po2 = await createPO("SUP-002", day(-17), [
  { sku: "SKU-BRS5", quantity: 60, unit_price: 68000 },
  { sku: "SKU-MNY1", quantity: 100, unit_price: 17500 },
  { sku: "SKU-GUL1", quantity: 80, unit_price: 16000 },
  { sku: "SKU-LSB1", quantity: 60, unit_price: 3800 },
  { sku: "SKU-ULT6", quantity: 60, unit_price: 5200 },
]);
await sendPO(po2);
await createAndPostGR(po2, day(-15), [["SKU-BRS5", 60], ["SKU-MNY1", 60], ["SKU-LSB1", 60], ["SKU-ULT6", 40]], "Pengiriman sebagian, gula menyusul");

const po3 = await createPO("SUP-002", day(-1), [
  { sku: "SKU-KPA1", quantity: 50, unit_price: 18000 },
  { sku: "SKU-GUL1", quantity: 80, unit_price: 16000 },
  { sku: "SKU-ULT6", quantity: 40, unit_price: 5200 },
]);

// ── 8. Penjualan: SO → SI → posting → pembayaran/retur ────────────────
async function createSO(customerCode, orderDate, items) {
  const soNumber = `SO-${compact(orderDate)}-001`;
  const total = items.reduce((s, i) => s + i.quantity * products[i.sku].sell, 0);
  const so = await create("sales_orders", {
    so_number: soNumber, customer_id: customers[customerCode], order_date: orderDate,
    expected_date: addDays(orderDate, 3), status: "draft", total_amount: total,
    notes: null, created_by: USER, created_at: iso(0),
  });
  const itemIds = {};
  for (const it of items) {
    const doc = await create("sales_order_items", {
      sales_order_id: so.$id, product_id: products[it.sku].id,
      quantity: it.quantity, unit_price: products[it.sku].sell, line_total: it.quantity * products[it.sku].sell,
    });
    itemIds[it.sku] = doc.$id;
  }
  console.log(`[ok] ${soNumber} ${rupiah(total)}`);
  return { id: so.$id, so_number: soNumber, itemIds, total };
}

async function confirmSO(so) {
  await db.updateDocument(DB, "sales_orders", so.id, { status: "confirmed", updated_by: USER, updated_at: iso(0) });
  console.log(`[confirmed] ${so.so_number}`);
}

async function createAndPostSI(so, invoiceDate, items) {
  const invoiceNumber = `INV-${compact(invoiceDate)}-001`;
  const soDoc = await db.getDocument(DB, "sales_orders", so.id);
  const subtotal = items.reduce((s, i) => s + i.quantity * products[i.sku].sell, 0);
  const si = await create("sales_invoices", {
    invoice_number: invoiceNumber, sales_order_id: so.id, customer_id: soDoc.customer_id,
    invoice_date: invoiceDate, due_date: addDays(invoiceDate, 14),
    subtotal, discount: 0, tax: 0, total_amount: subtotal,
    status: "draft", stock_override: null, override_by: null, override_note: null,
    created_by: USER, created_at: iso(0),
  });
  const siItemIds = {};
  for (const it of items) {
    const doc = await create("sales_invoice_items", {
      sales_invoice_id: si.$id, sales_order_item_id: so.itemIds[it.sku],
      product_id: products[it.sku].id, quantity: it.quantity,
      unit_price: products[it.sku].sell, line_total: it.quantity * products[it.sku].sell,
    });
    siItemIds[it.sku] = doc.$id;
  }
  await fnPost({ type: "sales_invoice", sales_invoice_id: si.$id, created_by: USER }, `${invoiceNumber} ${rupiah(subtotal)}`);
  return { id: si.$id, invoice_number: invoiceNumber, itemIds: siItemIds, total: subtotal };
}

console.log("=== Alur penjualan ===");
const so1 = await createSO("CUS-001", day(-14), [
  { sku: "SKU-IMI2", quantity: 50 },
  { sku: "SKU-AQU6", quantity: 40 },
]);
await confirmSO(so1);
const si1 = await createAndPostSI(so1, day(-13), [
  { sku: "SKU-IMI2", quantity: 50 },
  { sku: "SKU-AQU6", quantity: 40 },
]);

// Retur penjualan: Aqua 5 pcs kemasan rusak (dari SI-001)
{
  const returnNumber = `SR-${compact(day(-12))}-001`;
  const soDoc = await db.getDocument(DB, "sales_orders", so1.id);
  const sr = await create("sales_returns", {
    return_number: returnNumber, sales_invoice_id: si1.id, customer_id: soDoc.customer_id,
    return_date: day(-12), status: "draft", notes: "Kemasan penyok saat pengiriman",
    created_by: USER, created_at: iso(0),
  });
  await create("sales_return_items", {
    sales_return_id: sr.$id, sales_invoice_item_id: si1.itemIds["SKU-AQU6"],
    product_id: products["SKU-AQU6"].id, quantity: 5, unit_price: products["SKU-AQU6"].sell,
  });
  await fnPost({ type: "sales_return", sales_return_id: sr.$id, created_by: USER }, `${returnNumber} Aqua x5`);
}

// Pelunasan SI-001 setelah retur (315.000)
{
  const newTotal = si1.total - 5 * products["SKU-AQU6"].sell;
  const soDoc1 = await db.getDocument(DB, "sales_orders", so1.id);
  await create("sales_payments", {
    invoice_id: si1.id, customer_id: soDoc1.customer_id, payment_date: day(-11),
    amount: newTotal, method: "cash", cash_bank_account_id: "",
    reference: "BAYAR-TUNAI", notes: "Pelunasan setelah retur", created_by: USER, created_at: iso(0),
  });
  await db.updateDocument(DB, "sales_invoices", si1.id, { status: "paid" });
  console.log(`[paid] ${si1.invoice_number} ${rupiah(newTotal)}`);
}

const so2 = await createSO("CUS-002", day(-11), [
  { sku: "SKU-TBTB", quantity: 60 },
  { sku: "SKU-LSB1", quantity: 20 },
  { sku: "SKU-RNS1", quantity: 10 },
]);
await confirmSO(so2);
const si2 = await createAndPostSI(so2, day(-10), [
  { sku: "SKU-TBTB", quantity: 60 },
  { sku: "SKU-LSB1", quantity: 20 },
  { sku: "SKU-RNS1", quantity: 10 },
]);
// Pembayaran sebagian (DP 300.000) → status partial, masuk notifikasi
{
  const soDoc2 = await db.getDocument(DB, "sales_orders", so2.id);
  await create("sales_payments", {
    invoice_id: si2.id, customer_id: soDoc2.customer_id, payment_date: day(-8),
    amount: 300000, method: "bank_transfer", cash_bank_account_id: "",
    reference: "TRF-BCA-8812", notes: "Pembayaran sebagian", created_by: USER, created_at: iso(0),
  });
}
await db.updateDocument(DB, "sales_invoices", si2.id, { status: "partial" });
console.log(`[partial] ${si2.invoice_number} dibayar 300.000 dari ${rupiah(si2.total)}`);

const so3 = await createSO("CUS-004", day(-8), [
  { sku: "SKU-ULT6", quantity: 30 },
  { sku: "SKU-LSB1", quantity: 10 },
]);
await confirmSO(so3);
const si3 = await createAndPostSI(so3, day(-7), [
  { sku: "SKU-ULT6", quantity: 30 },
  { sku: "SKU-LSB1", quantity: 10 },
]);

// SO-004 draft (belum dikonfirmasi)
await createSO("CUS-003", day(-2), [
  { sku: "SKU-IMI2", quantity: 30 },
  { sku: "SKU-AQU6", quantity: 24 },
]);

// ── 9. Retur pembelian: minyak 5 botol rusak (dari PO-002) ────────────
{
  const returnDate = day(-5);
  const returnNumber = `PR-${compact(returnDate)}-001`;
  const pr = await create("purchase_returns", {
    return_number: returnNumber, supplier_id: suppliers["SUP-002"], purchase_order_id: po2.id,
    return_date: returnDate, status: "draft", notes: "Kaleng penyok, dikembalikan ke supplier",
    created_by: USER, created_at: iso(0),
  });
  await create("purchase_return_items", {
    purchase_return_id: pr.$id, product_id: products["SKU-MNY1"].id,
    quantity: 5, unit_price: 17500,
  });
  await fnPost({ type: "purchase_return", purchase_return_id: pr.$id, created_by: USER }, `${returnNumber} Minyak x5`);
}

// ── 10. Stock opname: selisih Indomie & beras ──────────────────────────
{
  const opnameDate = day(-3);
  const opnameNumber = `OP-${compact(opnameDate)}-D3M0`;
  const opname = await create("stock_opnames", {
    opname_number: opnameNumber, opname_date: opnameDate, status: "draft",
    note: "Opname rutin akhir bulan", created_by: USER, created_at: iso(0),
  });
  const items = [
    ["SKU-IMI2", 197, "3 pcs rusak digunakan uji rasa"],
    ["SKU-BRS5", 62, "Salah catat kartu stok"],
  ];
  for (const [sku, actual, note] of items) {
    const prod = await db.getDocument(DB, "products", products[sku].id);
    const systemQty = Number(prod.current_stock);
    await create("stock_opname_items", {
      stock_opname_id: opname.$id, product_id: products[sku].id,
      system_qty: systemQty, actual_qty: actual, difference: actual - systemQty, note,
    });
  }
  await fnPost({ type: "stock_opname", stock_opname_id: opname.$id, created_by: USER }, `${opnameNumber} (2 item)`);
}

// ── 11. Payroll periode lalu → posting (D Beban Gaji / C Kas) ──────────
{
  const period = day(-21).slice(0, 7);
  const runDate = day(-21);
  let totalGross = 0;
  let totalDeduction = 0;
  const details = [];
  for (const [emp] of employeeData) {
    const comps = await db.listDocuments(DB, "salary_components", [
      Query.equal("employee_id", [employees[emp]]), Query.limit(50),
    ]);
    const empDoc = await db.getDocument(DB, "employees", employees[emp]);
    const basic = Number(empDoc.basic_salary);
    const allowances = comps.documents.filter((c) => c.component_type === "allowance").reduce((s, c) => s + Number(c.amount), 0);
    const deductions = comps.documents.filter((c) => c.component_type === "deduction").reduce((s, c) => s + Number(c.amount), 0);
    totalGross += basic + allowances;
    totalDeduction += deductions;
    details.push({ employee_id: employees[emp], basic_salary: basic, total_allowance: allowances, total_deduction: deductions, net_salary: basic + allowances - deductions });
  }
  const totalNet = totalGross - totalDeduction;
  const run = await create("payroll_runs", {
    payroll_number: "PR-001", period, run_date: runDate, status: "draft",
    total_gross: totalGross, total_deduction: totalDeduction, total_net: totalNet,
    created_by: USER, created_at: iso(0),
  });
  for (const d of details) {
    await create("payroll_details", { payroll_run_id: run.$id, ...d });
  }
  await fnPost({ type: "payroll", payroll_run_id: run.$id, created_by: USER }, `Payroll ${period} ${rupiah(totalNet)}`);
}

// ── 12. Ringkasan ──────────────────────────────────────────────────────
console.log("\n=== Ringkasan data demo ===");
const prods = await db.listDocuments(DB, "products", [Query.limit(100)]);
let stockValue = 0;
const low = [];
for (const p of prods.documents) {
  stockValue += Number(p.current_stock) * Number(p.cost_price);
  if (Number(p.current_stock) < Number(p.min_stock)) low.push(`${p.name} (${p.current_stock}/${p.min_stock})`);
}
console.log(`Produk: ${prods.total}, nilai persediaan: ${rupiah(stockValue)}`);
console.log(`Stok menipis: ${low.join(", ") || "-"}`);
for (const c of ["purchase_orders", "goods_receipts", "sales_orders", "sales_invoices", "sales_payments", "sales_returns", "purchase_returns", "stock_opnames", "payroll_runs", "journal_entries", "stock_movements"]) {
  const r = await db.listDocuments(DB, c, [Query.limit(1)]);
  console.log(`${c}: ${r.total}`);
}
console.log("\nSELESAI. Login admin@erp.local untuk demo.");
