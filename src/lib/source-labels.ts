const SOURCE_LABELS: Record<string, string> = {
  stock_opname: "Stock Opname",
  goods_receipt: "Goods Receipt",
  purchase_return: "Purchase Return",
  sales_invoice: "Sales Invoice",
  sales_payment: "Sales Payment",
  sales_return: "Sales Return",
  manual: "Manual",
};

export function sourceTypeLabel(s: string): string {
  return SOURCE_LABELS[s] ?? s;
}
