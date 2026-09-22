/**
 * Validate a sales invoice posting request. Returns validated payload or errors.
 */
export function validatePostSalesInvoiceInput(body) {
  const errors = {};
  if (!body?.sales_invoice_id) errors.sales_invoice_id = "sales_invoice_id wajib.";
  if (!body?.created_by) errors.created_by = "created_by wajib.";
  return Object.keys(errors).length > 0 ? { errors } : { payload: body };
}

/**
 * Build stock movement and journal entry documents for a sales invoice.
 *
 * Variant-aware (butik fashion): item boleh membawa `product_variant_id`.
 * Info stok/kepemilikan varian dipasok lewat `options.variantInfos`
 * (Map variant_id -> { product_id, current_stock } atau objek biasa).
 * Override stok via `options.allowOverride` atau `invoice.stock_override`.
 * Parameter `options` opsional — pemanggil lama dengan 4 argumen tidak rusak.
 *
 * Returns { stock_movements: [], journal_entry: {...}, updates: [], variant_updates: [] }
 * atau { errors } bila ada item tak valid (atomic: tanpa movement sama sekali).
 *
 * Journal plan:
 *   Debit  : Piutang Usaha (1120)
 *   Credit : Pendapatan Penjualan (4100)
 */
export function buildSalesInvoiceJournalPlan(invoice, items, coa_map, created_by, options = {}) {
  const ar_acct = coa_map.get("1120");
  const rev_acct = coa_map.get("4100");
  if (!ar_acct || !rev_acct) {
    return {
      errors: {
        _form: `Akun ${
          !ar_acct ? "Piutang Usaha (1120)" : "Pendapatan Penjualan (4100)"
        } tidak ditemukan di COA.`,
      },
    };
  }

  const variantInfos = options.variantInfos ?? options.variant_stocks ?? new Map();
  const allowOverride = options.allowOverride ?? invoice?.stock_override ?? false;
  const lookupVariant = (id) =>
    variantInfos instanceof Map ? variantInfos.get(id) : variantInfos[id];

  const now = new Date().toISOString();
  const errors = {};
  const stock_movements = [];
  const product_updates = [];
  const variant_updates = [];

  items.forEach((item, idx) => {
    if (!item._product) return;
    const prefix = `items.${idx}`;
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      errors[`${prefix}.quantity`] = "Qty harus angka > 0.";
      return;
    }
    const variantId = item.product_variant_id ?? null;
    const delta = -(qty);
    if (variantId != null) {
      const info = lookupVariant(variantId);
      if (info) {
        if (info.product_id !== item.product_id) {
          errors[`${prefix}.product_variant_id`] = `Varian ${variantId} bukan milik produk ${item.product_id}.`;
          return;
        }
        const available = Number(info.current_stock);
        if (!allowOverride && Number.isFinite(available) && available < qty) {
          errors[`${prefix}.product_variant_id`] =
            `Stok varian ${variantId} tidak cukup: tersedia ${available}, dibutuhkan ${qty}.`;
          return;
        }
      }
    }
    const movement = {
      product_id: item.product_id,
      movement_type: "sales_invoice",
      quantity_delta: delta,
      source_type: "sales_invoice",
      source_id: invoice.$id,
      note: `Penjualan - ${invoice.invoice_number}`,
      created_by,
      created_at: now,
    };
    if (variantId != null) movement.product_variant_id = variantId;
    stock_movements.push(movement);
    product_updates.push({
      product_id: item.product_id,
      delta,
    });
    if (variantId != null) variant_updates.push({ variant_id: variantId, delta });
  });

  if (Object.keys(errors).length > 0) return { errors };

  const journal_entry = {
    entry_number: `JE-SI-${(invoice.invoice_number || "").replace("INV-", "")}`,
    entry_date: invoice.invoice_date || invoice.created_at?.slice(0, 10) || now.slice(0, 10),
    source_type: "sales_invoice",
    source_id: invoice.$id,
    description: `Penjualan - ${invoice.invoice_number}`,
    total_debit: invoice.total_amount,
    total_credit: invoice.total_amount,
    status: "posted",
    created_by,
    created_at: now,
    lines: [
      {
        account_id: ar_acct.$id,
        debit: invoice.total_amount,
        credit: 0,
        description: invoice.invoice_number,
      },
      {
        account_id: rev_acct.$id,
        debit: 0,
        credit: invoice.total_amount,
        description: invoice.invoice_number,
      },
    ],
  };

  const updates = product_updates;

  return { stock_movements, journal_entry, updates, variant_updates };
}
