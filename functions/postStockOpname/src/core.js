// Combined validation & planning for postTransaction (stock_opname + goods_receipt).

// ─── Stock Opname ───────────────────────────────────────────────────────
export function validatePostOpnameInput(payload) {
  const errors = {};
  const stock_opname_id = String(payload.stock_opname_id ?? "");
  const created_by = String(payload.created_by ?? "");
  if (!stock_opname_id) errors.stock_opname_id = "stock_opname_id wajib diisi.";
  if (!created_by) errors.created_by = "created_by wajib diisi.";
  return {
    errors,
    stock_opname_id,
    created_by,
    allowNegative: payload.allow_negative === true || payload.allowNegative === true,
  };
}

export function buildAdjustments(items, variantInfos = new Map()) {
  const adjustments = [];
  const errors = {};
  const lookupVariant = (id) =>
    variantInfos instanceof Map ? variantInfos.get(id) : variantInfos[id];
  items.forEach((item, i) => {
    const prefix = `items.${i}`;
    if (!item.product_id) {
      errors[`${prefix}.product_id`] = "Produk wajib diisi.";
      return;
    }
    const variantId = item.product_variant_id ?? null;
    if (variantId != null) {
      const info = lookupVariant(variantId);
      if (info && info.product_id !== item.product_id) {
        errors[`${prefix}.product_variant_id`] = `Varian ${variantId} bukan milik produk ${item.product_id}.`;
        return;
      }
    }
    const hasSys = item.system_qty !== undefined && item.system_qty !== null && item.system_qty !== "";
    const hasAct = item.actual_qty !== undefined && item.actual_qty !== null && item.actual_qty !== "";
    let diff;
    if (hasSys || hasAct) {
      const sys = Number(item.system_qty);
      const act = Number(item.actual_qty);
      if (!Number.isFinite(sys)) {
        errors[`${prefix}.system_qty`] = "system_qty harus angka.";
        return;
      }
      if (sys < 0) {
        errors[`${prefix}.system_qty`] = "system_qty tidak boleh negatif.";
        return;
      }
      if (!Number.isFinite(act)) {
        errors[`${prefix}.actual_qty`] = "actual_qty harus angka.";
        return;
      }
      if (act < 0) {
        errors[`${prefix}.actual_qty`] = "actual_qty tidak boleh negatif.";
        return;
      }
      diff = act - sys;
    } else {
      diff = Number(item.difference);
      if (!Number.isFinite(diff)) {
        errors[`${prefix}.difference`] = "Selisih tidak valid.";
        return;
      }
    }
    if (diff !== 0) {
      const adj = {
        product_id: item.product_id,
        difference: diff,
      };
      if (variantId != null) adj.product_variant_id = variantId;
      adjustments.push(adj);
    }
  });
  return { adjustments, errors };
}

// ─── Goods Receipt ──────────────────────────────────────────────────────
export function validatePostGRInput(payload) {
  const errors = {};
  const goods_receipt_id = String(payload.goods_receipt_id ?? "");
  const created_by = String(payload.created_by ?? "");
  if (!goods_receipt_id) errors.goods_receipt_id = "goods_receipt_id wajib diisi.";
  if (!created_by) errors.created_by = "created_by wajib diisi.";
  return { errors, goods_receipt_id, created_by };
}

export function buildJournalPlan({ gr_items, po_items_map }) {
  let total = 0;
  for (const gi of gr_items) {
    const po_item = po_items_map.get(gi.purchase_order_item_id);
    if (!po_item) continue;
    total += Number(gi.quantity_received) * Number(po_item.unit_price);
  }
  if (total <= 0) return { total_amount: 0, lines: [], error: "total_zero" };
  return {
    total_amount: total,
    lines: [
      { account_code: "1210", account_name: "Persediaan", debit: total, credit: 0, description: "Persediaan dari GR" },
      { account_code: "2110", account_name: "Hutang Usaha", debit: 0, credit: total, description: "Hutang Usaha dari GR" },
    ],
  };
}

// ─── Purchase Return ──────────────────────────────────────────────────
export function validatePostPRInput(payload) {
  const errors = {};
  const purchase_return_id = String(payload.purchase_return_id ?? "");
  const created_by = String(payload.created_by ?? "");
  if (!purchase_return_id) errors.purchase_return_id = "purchase_return_id wajib diisi.";
  if (!created_by) errors.created_by = "created_by wajib diisi.";
  return { errors, purchase_return_id, created_by };
}

export function buildPRJournalPlan({ pr_items, po_items_map }) {
  let total = 0;
  for (const ri of pr_items) {
    const po_item = po_items_map.get(ri.product_id);
    if (!po_item) continue;
    total += Number(ri.quantity) * Number(ri.unit_price);
  }
  if (total <= 0) return { total_amount: 0, lines: [], error: "total_zero" };
  return {
    total_amount: total,
    lines: [
      { account_code: "2110", account_name: "Hutang Usaha", debit: total, credit: 0, description: "Hutang Usaha dari Purchase Return" },
      { account_code: "1210", account_name: "Persediaan", debit: 0, credit: total, description: "Persediaan dari Purchase Return" },
    ],
  };
}

export function determinePOStatusAfterReturn(cumulative_received, cumulative_returned, po_items) {
  let allFullyReceived = true;
  let anyReceived = false;
  for (const pi of po_items) {
    const received = cumulative_received.get(pi.product_id) ?? 0;
    const returned = cumulative_returned.get(pi.product_id) ?? 0;
    const net = received - returned;
    if (net > 0) anyReceived = true;
    if (net < Number(pi.quantity)) allFullyReceived = false;
  }
  if (!anyReceived) return "ordered";
  if (allFullyReceived) return "received";
  return "partial";
}

export function determinePOStatus(cumulative, po_items) {
  let allFullyReceived = true;
  let anyReceived = false;
  for (const pi of po_items) {
    const received = cumulative.get(pi.$id) ?? 0;
    if (received > 0) anyReceived = true;
    if (received < Number(pi.quantity)) allFullyReceived = false;
  }
  if (!anyReceived) return "ordered";
  if (allFullyReceived) return "received";
  return "partial";
}

// ─── Variant-aware stock plans (GR / purchase-return / sales-return) ───
// Pola mengikuti buildSalesInvoiceJournalPlan di core-sales-invoice.js:
// item boleh membawa `product_variant_id` (NULL = tanpa varian, backward-
// compat: field varian absen di movement). Kepemilikan varian dicek lewat
// `options.variantInfos` (Map variant_id -> { product_id, ... } atau objek
// biasa). Atomic: ada satu error -> return { errors } tanpa movement.
// GR/SR = stok masuk (delta positif), PR = stok keluar (delta negatif).
function buildVariantStockPlan({ doc, items, qtyField, qtyErrorField, movement_type, note, created_by, variantInfos }) {
  const lookupVariant = (id) =>
    variantInfos instanceof Map ? variantInfos.get(id) : variantInfos[id];

  const now = new Date().toISOString();
  const errors = {};
  const stock_movements = [];
  const updates = [];
  const variant_updates = [];

  items.forEach((item, idx) => {
    const prefix = `items.${idx}`;
    const qty = Number(item[qtyField]);
    if (!Number.isFinite(qty) || qty <= 0) {
      errors[`${prefix}.${qtyErrorField}`] = "Qty harus angka > 0.";
      return;
    }
    const variantId = item.product_variant_id ?? null;
    if (variantId != null) {
      const info = lookupVariant(variantId);
      if (info && info.product_id !== item.product_id) {
        errors[`${prefix}.product_variant_id`] = `Varian ${variantId} bukan milik produk ${item.product_id}.`;
        return;
      }
    }
    const movement = {
      product_id: item.product_id,
      movement_type,
      quantity_delta: movement_type === "purchase_return" ? -qty : qty,
      source_type: movement_type,
      source_id: doc.$id,
      note,
      created_by,
      created_at: now,
    };
    if (variantId != null) movement.product_variant_id = variantId;
    stock_movements.push(movement);
    updates.push({ product_id: item.product_id, delta: movement.quantity_delta });
    if (variantId != null) variant_updates.push({ variant_id: variantId, delta: movement.quantity_delta });
  });

  if (Object.keys(errors).length > 0) return { errors };

  return { stock_movements, updates, variant_updates };
}

export function buildGRStockPlan(gr, gr_items, created_by, options = {}) {
  return buildVariantStockPlan({
    doc: gr,
    items: gr_items,
    qtyField: "quantity_received",
    qtyErrorField: "quantity_received",
    movement_type: "goods_receipt",
    note: `GR ${gr.gr_number}`,
    created_by,
    variantInfos: options.variantInfos ?? new Map(),
  });
}

export function buildPRStockPlan(pr, pr_items, created_by, options = {}) {
  return buildVariantStockPlan({
    doc: pr,
    items: pr_items,
    qtyField: "quantity",
    qtyErrorField: "quantity",
    movement_type: "purchase_return",
    note: `PR ${pr.return_number}`,
    created_by,
    variantInfos: options.variantInfos ?? new Map(),
  });
}

export function buildSRStockPlan(sr, sr_items, created_by, options = {}) {
  return buildVariantStockPlan({
    doc: sr,
    items: sr_items,
    qtyField: "quantity",
    qtyErrorField: "quantity",
    movement_type: "sales_return",
    note: `Retur penjualan ${sr.return_number}`,
    created_by,
    variantInfos: options.variantInfos ?? new Map(),
  });
}
