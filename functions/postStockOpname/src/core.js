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
    allowNegative: payload.allowNegative === true,
  };
}

export function buildAdjustments(items) {
  const adjustments = [];
  const errors = {};
  for (const item of items) {
    const diff = Number(item.difference);
    if (!item.product_id) {
      errors.items = "Ada item tanpa produk.";
      break;
    }
    if (!Number.isFinite(diff)) {
      errors.items = "Selisih tidak valid.";
      break;
    }
    if (diff !== 0) {
      adjustments.push({
        product_id: item.product_id,
        difference: diff,
      });
    }
  }
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
      { account_code: "1110", account_name: "Persediaan", debit: total, credit: 0, description: "Persediaan dari GR" },
      { account_code: "2110", account_name: "Hutang Usaha", debit: 0, credit: total, description: "Hutang Usaha dari GR" },
    ],
  };
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
