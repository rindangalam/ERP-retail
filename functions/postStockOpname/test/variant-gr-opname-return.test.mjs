// Task 8a — GR/opname/retur sadar-varian (TDD, butik fashion).
//
// Yang diuji UNIT di file ini (builder murni di src/core.js):
//   - buildGRStockPlan / buildPRStockPlan / buildSRStockPlan:
//     movement membawa product_variant_id + delta bertanda benar +
//     variant_updates [{ variant_id, delta }]; item tanpa varian -> field
//     varian absen (backward-compat); varian milik produk lain -> errors
//     dan TANPA movement (atomic).
//   - buildAdjustments (opname): adjustment membawa product_variant_id
//     + difference benar; item tanpa varian -> bentuk lama.
//
// Yang diverifikasi HANDLER-LEVEL (mock DB) di bagian bawah file ini:
//   - handlePostGR: varian tak dikenal -> 404, varian asing -> 400,
//     keduanya SEBELUM movement dibuat (createDocument tidak terpanggil);
//     varian valid -> ok:true + movement membawa product_variant_id.
//   - handlePostPR ber-PO: varian valid lolos tanpa ReferenceError +
//     movement bervarian dibuat; varian asing/tak dikenal ditolak
//     400/404 (bukan crash 500) sebelum movement dibuat.
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAdjustments,
  buildGRStockPlan,
  buildPRStockPlan,
  buildSRStockPlan,
} from "../src/core.js";

function variantInfos(entries) {
  return new Map(entries);
}

// ─── (1) GR item bervarian -> movement + variant_updates, delta positif ───
test("GR bervarian: movement + variant_updates delta positif", () => {
  const gr = { $id: "gr-1", gr_number: "GR-001" };
  const items = [{ product_id: "p1", product_variant_id: "v1", quantity_received: 5 }];
  const r = buildGRStockPlan(gr, items, "u1", {
    variantInfos: variantInfos([["v1", { product_id: "p1", current_stock: 10 }]]),
  });
  assert.ok(!r.errors, JSON.stringify(r.errors));
  assert.equal(r.stock_movements.length, 1);
  assert.equal(r.stock_movements[0].product_variant_id, "v1");
  assert.equal(r.stock_movements[0].quantity_delta, 5);
  assert.equal(r.stock_movements[0].movement_type, "goods_receipt");
  assert.deepEqual(r.variant_updates, [{ variant_id: "v1", delta: 5 }]);
});

// ─── (2) opname item bervarian -> adjustment per varian benar ───
test("opname bervarian: adjustment per varian benar", () => {
  const items = [{ product_id: "p1", product_variant_id: "v1", system_qty: 10, actual_qty: 12 }];
  const r = buildAdjustments(items, variantInfos([["v1", { product_id: "p1", current_stock: 10 }]]));
  assert.equal(Object.keys(r.errors).length, 0, JSON.stringify(r.errors));
  assert.equal(r.adjustments.length, 1);
  assert.equal(r.adjustments[0].product_variant_id, "v1");
  assert.equal(r.adjustments[0].difference, 2);
});

// ─── (3) sales-return item bervarian -> movement positif + variant_updates ───
test("sales-return bervarian: movement positif + variant_updates", () => {
  const sr = { $id: "sr-1", return_number: "SR-001" };
  const items = [{ product_id: "p1", product_variant_id: "v1", quantity: 3, unit_price: 50000 }];
  const r = buildSRStockPlan(sr, items, "u1", {
    variantInfos: variantInfos([["v1", { product_id: "p1", current_stock: 1 }]]),
  });
  assert.ok(!r.errors, JSON.stringify(r.errors));
  assert.equal(r.stock_movements.length, 1);
  assert.equal(r.stock_movements[0].product_variant_id, "v1");
  assert.equal(r.stock_movements[0].quantity_delta, 3);
  assert.equal(r.stock_movements[0].movement_type, "sales_return");
  assert.deepEqual(r.variant_updates, [{ variant_id: "v1", delta: 3 }]);
});

// ─── purchase-return bervarian -> movement negatif + variant_updates ───
test("purchase-return bervarian: movement negatif + variant_updates", () => {
  const pr = { $id: "pr-1", return_number: "PR-001" };
  const items = [{ product_id: "p1", product_variant_id: "v1", quantity: 2, unit_price: 40000 }];
  const r = buildPRStockPlan(pr, items, "u1", {
    variantInfos: variantInfos([["v1", { product_id: "p1", current_stock: 8 }]]),
  });
  assert.ok(!r.errors, JSON.stringify(r.errors));
  assert.equal(r.stock_movements.length, 1);
  assert.equal(r.stock_movements[0].product_variant_id, "v1");
  assert.equal(r.stock_movements[0].quantity_delta, -2);
  assert.equal(r.stock_movements[0].movement_type, "purchase_return");
  assert.deepEqual(r.variant_updates, [{ variant_id: "v1", delta: -2 }]);
});

// ─── (4) backward-compat: tanpa varian -> perilaku lama ───
test("GR tanpa varian: movement tanpa field varian", () => {
  const r = buildGRStockPlan({ $id: "gr-1", gr_number: "GR-001" }, [{ product_id: "p1", quantity_received: 4 }], "u1");
  assert.ok(!r.errors, JSON.stringify(r.errors));
  assert.equal(r.stock_movements.length, 1);
  assert.ok(!("product_variant_id" in r.stock_movements[0]), "field varian harus absen");
  assert.deepEqual(r.variant_updates ?? [], []);
});

test("opname tanpa varian: adjustment bentuk lama", () => {
  const r = buildAdjustments([{ product_id: "p1", system_qty: 10, actual_qty: 7 }]);
  assert.equal(Object.keys(r.errors).length, 0);
  assert.equal(r.adjustments.length, 1);
  assert.ok(!("product_variant_id" in r.adjustments[0]), "field varian harus absen");
  assert.equal(r.adjustments[0].difference, -3);
});

test("sales-return tanpa varian: movement tanpa field varian", () => {
  const r = buildSRStockPlan({ $id: "sr-1", return_number: "SR-001" }, [{ product_id: "p1", quantity: 1, unit_price: 10000 }], "u1");
  assert.ok(!r.errors, JSON.stringify(r.errors));
  assert.ok(!("product_variant_id" in r.stock_movements[0]), "field varian harus absen");
  assert.deepEqual(r.variant_updates ?? [], []);
});

test("purchase-return tanpa varian: movement tanpa field varian", () => {
  const r = buildPRStockPlan({ $id: "pr-1", return_number: "PR-001" }, [{ product_id: "p1", quantity: 1, unit_price: 10000 }], "u1");
  assert.ok(!r.errors, JSON.stringify(r.errors));
  assert.ok(!("product_variant_id" in r.stock_movements[0]), "field varian harus absen");
  assert.deepEqual(r.variant_updates ?? [], []);
});

// ─── atomic: varian milik produk lain -> errors, tanpa movement ───
test("GR varian milik produk lain -> errors, tanpa movement", () => {
  const r = buildGRStockPlan({ $id: "gr-1", gr_number: "GR-001" }, [{ product_id: "p1", product_variant_id: "vX", quantity_received: 1 }], "u1", {
    variantInfos: variantInfos([["vX", { product_id: "p9", current_stock: 50 }]]),
  });
  assert.ok(r.errors && Object.keys(r.errors).length > 0, "harus ada errors");
  assert.ok(!r.stock_movements || r.stock_movements.length === 0, "tidak boleh ada movement");
});

test("opname varian milik produk lain -> error per-item, item dikecualikan", () => {
  const r = buildAdjustments(
    [{ product_id: "p1", product_variant_id: "vX", system_qty: 5, actual_qty: 6 }],
    variantInfos([["vX", { product_id: "p9", current_stock: 50 }]])
  );
  assert.ok(r.errors["items.0.product_variant_id"], "harus ada error varian");
  assert.equal(r.adjustments.length, 0);
});

// ─── handler-level (mock DB): GR/PR validasi varian sebelum write ───
// Regression test 2 bug blocker: GR tanpa validasi varian + PR crash
// gr_items undefined. Handler diimpor langsung dari src/index.js dan
// didorong dengan mock `databases` + `res` (tanpa Appwrite).
import { handlePostGR, handlePostPR } from "../src/index.js";

function mockRes() {
  const calls = [];
  return {
    calls,
    json(body, status = 200) {
      calls.push({ body, status });
      return { body, status };
    },
  };
}

function makeMockDB({ docs = {}, lists = {} }) {
  const created = [];
  const updated = [];
  const databases = {
    async getDocument(_db, coll, id) {
      const table = docs[coll] ?? {};
      if (table[id] !== undefined && table[id] !== null) return table[id];
      const e = new Error("not found");
      e.code = 404;
      throw e;
    },
    async listDocuments(_db, coll, queries) {
      const s = (queries ?? []).join(" ");
      if (coll === "chart_of_accounts") {
        return { documents: [{ $id: "coa-inv", code: "1210" }, { $id: "coa-ap", code: "2110" }] };
      }
      if (coll === "journal_entries") return { documents: [] };
      // Cek duplikat movement / agregasi: tidak ada duplikat di fixture.
      if (s.includes("movement_type") || s.includes("source_type")) return { documents: [] };
      for (const key of Object.keys(lists)) {
        const [lcoll, lfield] = key.split("|");
        if (lcoll === coll && s.includes(lfield)) {
          const m = s.match(/\["([^"]+)"\]/);
          const val = m && m[1];
          return { documents: (lists[key][val] ?? []).slice() };
        }
      }
      return { documents: [] };
    },
    async createDocument(_db, coll, _id, data) {
      created.push({ coll, data });
      return { $id: `new-${created.length}`, ...data };
    },
    async updateDocument(_db, coll, id, data) {
      updated.push({ coll, id, data });
      return { $id: id, ...data };
    },
  };
  return { databases, created, updated };
}

const GR_ID = "gr-1";
function grFixture({ items, variants }) {
  const gr = { $id: GR_ID, gr_number: "GR-001", status: "draft", purchase_order_id: "po-1", received_date: "2026-09-20" };
  const docs = {
    goods_receipts: { [GR_ID]: gr },
    purchase_orders: { "po-1": { $id: "po-1", po_number: "PO-001" } },
    product_variants: variants,
  };
  const lists = {
    "goods_receipt_items|goods_receipt_id": { [GR_ID]: items },
    "purchase_order_items|purchase_order_id": {
      "po-1": [{ $id: "poi-1", product_id: "p1", quantity: 10, unit_price: 50000 }],
    },
    "goods_receipts|purchase_order_id": { "po-1": [] },
  };
  return makeMockDB({ docs, lists });
}

test("GR handler: varian tidak dikenal ditolak 404 sebelum movement dibuat", async () => {
  const items = [{ $id: "gi-1", product_id: "p1", purchase_order_item_id: "poi-1", quantity_received: 2, product_variant_id: "v-ghost" }];
  const f = grFixture({ items, variants: {} });
  const res = mockRes();
  await handlePostGR(f.databases, { goods_receipt_id: GR_ID, created_by: "u1" }, res, () => {});
  assert.equal(res.calls.length, 1);
  assert.equal(res.calls[0].status, 404, JSON.stringify(res.calls[0].body));
  assert.equal(f.created.length, 0, "tidak boleh ada write sebelum validasi lolos");
});

test("GR handler: varian asing ditolak 400 sebelum movement dibuat", async () => {
  const items = [{ $id: "gi-1", product_id: "p1", purchase_order_item_id: "poi-1", quantity_received: 2, product_variant_id: "vX" }];
  const f = grFixture({ items, variants: { vX: { $id: "vX", product_id: "p9" } } });
  const res = mockRes();
  await handlePostGR(f.databases, { goods_receipt_id: GR_ID, created_by: "u1" }, res, () => {});
  assert.equal(res.calls.length, 1);
  assert.equal(res.calls[0].status, 400, JSON.stringify(res.calls[0].body));
  assert.equal(f.created.length, 0, "tidak boleh ada write sebelum validasi lolos");
});

test("GR handler: varian valid lolos dan movement membawa product_variant_id", async () => {
  const items = [{ $id: "gi-1", product_id: "p1", purchase_order_item_id: "poi-1", quantity_received: 2, product_variant_id: "v1" }];
  const f = grFixture({ items, variants: { v1: { $id: "v1", product_id: "p1" } } });
  const res = mockRes();
  await handlePostGR(f.databases, { goods_receipt_id: GR_ID, created_by: "u1" }, res, () => {});
  assert.equal(res.calls.length, 1);
  assert.equal(res.calls[0].body.ok, true, JSON.stringify(res.calls[0].body));
  const mv = f.created.find((c) => c.coll === "stock_movements");
  assert.ok(mv, "movement harus dibuat");
  assert.equal(mv.data.product_variant_id, "v1");
  assert.equal(mv.data.quantity_delta, 2);
});

const PR_ID = "pr-1";
function prFixture({ items, variants }) {
  const docs = {
    purchase_returns: { [PR_ID]: { $id: PR_ID, return_number: "PR-001", status: "draft", purchase_order_id: "po-1", return_date: "2026-09-20" } },
    purchase_orders: { "po-1": { $id: "po-1", po_number: "PO-001" } },
    product_variants: variants,
  };
  const lists = {
    "purchase_return_items|purchase_return_id": { [PR_ID]: items },
    "purchase_order_items|purchase_order_id": {
      "po-1": [{ $id: "poi-1", product_id: "p1", quantity: 10, unit_price: 40000 }],
    },
    // Satu GR posted (5 pcs) agar qty retur 2 <= net diterima 5.
    "goods_receipts|purchase_order_id": { "po-1": [{ $id: "gr-9", status: "posted" }] },
    "goods_receipt_items|goods_receipt_id": {
      "gr-9": [{ purchase_order_item_id: "poi-1", quantity_received: 5 }],
    },
    "purchase_returns|purchase_order_id": { "po-1": [] },
  };
  return makeMockDB({ docs, lists });
}

test("PR handler ber-PO: varian valid lolos tanpa crash, movement bervarian dibuat", async () => {
  const items = [{ $id: "ri-1", product_id: "p1", product_variant_id: "v1", quantity: 2, unit_price: 40000 }];
  const f = prFixture({ items, variants: { v1: { $id: "v1", product_id: "p1" } } });
  const res = mockRes();
  await handlePostPR(f.databases, { purchase_return_id: PR_ID, created_by: "u1" }, res, () => {});
  assert.equal(res.calls.length, 1);
  assert.equal(res.calls[0].body.ok, true, JSON.stringify(res.calls[0].body));
  const mv = f.created.find((c) => c.coll === "stock_movements");
  assert.ok(mv, "movement harus dibuat");
  assert.equal(mv.data.product_variant_id, "v1");
  assert.equal(mv.data.quantity_delta, -2);
});

test("PR handler ber-PO: varian asing ditolak 400 (bukan crash) sebelum movement dibuat", async () => {
  const items = [{ $id: "ri-1", product_id: "p1", product_variant_id: "vX", quantity: 2, unit_price: 40000 }];
  const f = prFixture({ items, variants: { vX: { $id: "vX", product_id: "p9" } } });
  const res = mockRes();
  await handlePostPR(f.databases, { purchase_return_id: PR_ID, created_by: "u1" }, res, () => {});
  assert.equal(res.calls.length, 1);
  assert.equal(res.calls[0].status, 400, JSON.stringify(res.calls[0].body));
  assert.equal(f.created.length, 0, "tidak boleh ada write sebelum validasi lolos");
});

test("PR handler ber-PO: varian tidak dikenal ditolak 404 (bukan crash) sebelum movement dibuat", async () => {
  const items = [{ $id: "ri-1", product_id: "p1", product_variant_id: "v-ghost", quantity: 2, unit_price: 40000 }];
  const f = prFixture({ items, variants: {} });
  const res = mockRes();
  await handlePostPR(f.databases, { purchase_return_id: PR_ID, created_by: "u1" }, res, () => {});
  assert.equal(res.calls.length, 1);
  assert.equal(res.calls[0].status, 404, JSON.stringify(res.calls[0].body));
  assert.equal(f.created.length, 0, "tidak boleh ada write sebelum validasi lolos");
});
