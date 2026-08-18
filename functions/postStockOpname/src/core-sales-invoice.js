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
 * Returns { stock_movements: [], journal_entry: {...}, updates: [] }.
 *
 * Journal plan:
 *   Debit  : Piutang Usaha (1120)
 *   Credit : Pendapatan Penjualan (4100)
 */
export function buildSalesInvoiceJournalPlan(invoice, items, coa_map, created_by) {
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

  const now = new Date().toISOString();
  const stock_movements = [];
  const product_updates = [];

  for (const item of items) {
    if (!item._product) continue;
    const delta = -(item.quantity);
    stock_movements.push({
      product_id: item.product_id,
      movement_type: "sales_invoice",
      quantity_delta: delta,
      source_type: "sales_invoice",
      source_id: invoice.$id,
      note: `Penjualan - ${invoice.invoice_number}`,
      created_by,
      created_at: now,
    });
    product_updates.push({
      product_id: item.product_id,
      delta,
    });
  }

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

  return { stock_movements, journal_entry, updates };
}
