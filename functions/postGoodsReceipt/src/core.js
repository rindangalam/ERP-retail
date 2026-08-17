// Validation & planning logic for postGoodsReceipt function.

/**
 * Validate the input payload for posting a goods receipt.
 * @param {{ goods_receipt_id?: string, created_by?: string }} payload
 * @returns {{ errors: Record<string, string>, goods_receipt_id: string, created_by: string }}
 */
export function validatePostGRInput(payload) {
  const errors = {};
  const goods_receipt_id = String(payload.goods_receipt_id ?? "");
  const created_by = String(payload.created_by ?? "");

  if (!goods_receipt_id) errors.goods_receipt_id = "goods_receipt_id wajib diisi.";
  if (!created_by) errors.created_by = "created_by wajib diisi.";

  return { errors, goods_receipt_id, created_by };
}

/**
 * Build a journal entry plan from GR items and PO items.
 * Debit Persediaan (1110), Credit Hutang Usaha (2110).
 * @param {{ gr_items: Array, po_items: Map }} params
 * @returns {{ total_amount: number, lines: Array }}
 */
export function buildJournalPlan({ gr_items, po_items_map }) {
  const lines = [];
  let total = 0;

  for (const gi of gr_items) {
    const po_item = po_items_map.get(gi.purchase_order_item_id);
    if (!po_item) continue;
    const qty = Number(gi.quantity_received);
    const price = Number(po_item.unit_price);
    total += qty * price;
  }

  if (total <= 0) {
    return { total_amount: 0, lines: [], error: "total_zero" };
  }

  return {
    total_amount: total,
    lines: [
      {
        account_id: "", // will be resolved by caller
        account_code: "1110",
        account_name: "Persediaan",
        debit: total,
        credit: 0,
        description: "Persediaan dari GR",
      },
      {
        account_id: "",
        account_code: "2110",
        account_name: "Hutang Usaha",
        debit: 0,
        credit: total,
        description: "Hutang Usaha dari GR",
      },
    ],
  };
}

/**
 * Determine PO status after GR posting.
 * @param {Array} all_gr_items_for_po — cumulative qty_received per PO item
 * @param {Array} po_items — original PO items with quantity
 * @returns {"ordered" | "partial" | "received"}
 */
export function determinePOStatus(cumulative_received, po_items) {
  let allFullyReceived = true;
  let anyReceived = false;

  for (const po_item of po_items) {
    const received = cumulative_received.get(po_item.$id) ?? 0;
    if (received > 0) anyReceived = true;
    if (received < Number(po_item.quantity)) {
      allFullyReceived = false;
    }
  }

  if (!anyReceived) return "ordered";
  if (allFullyReceived) return "received";
  return "partial";
}
