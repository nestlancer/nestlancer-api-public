import { toRupees } from '@nestlancer/common';

export type QuoteItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type PackageJsonRow = {
  description?: string;
  label?: string;
  quantity?: number;
  unitPrice?: number;
  unitPricePaise?: number;
  optional?: boolean;
};

function parseJsonArray(field: unknown): PackageJsonRow[] {
  if (!field) return [];
  if (Array.isArray(field)) return field as PackageJsonRow[];
  return [];
}

function rowToQuoteItem(row: PackageJsonRow): QuoteItemInput | null {
  const description = (row.description ?? row.label ?? '').trim();
  if (!description) return null;

  const quantity = Math.max(1, Number(row.quantity) || 1);
  let unitPrice = 0;
  if (typeof row.unitPrice === 'number' && row.unitPrice > 0) {
    unitPrice = row.unitPrice;
  } else if (typeof row.unitPricePaise === 'number' && row.unitPricePaise > 0) {
    unitPrice = toRupees(row.unitPricePaise);
  }

  return { description, quantity, unitPrice };
}

/** Maps ServicePackage deliverables/addOns JSON into admin quote line items (major currency units). */
export function mapPackageToQuoteItems(
  deliverables: unknown,
  addOns?: unknown,
  includeOptionalAddOns = false,
): QuoteItemInput[] {
  const items: QuoteItemInput[] = [];

  for (const row of parseJsonArray(deliverables)) {
    const item = rowToQuoteItem(row);
    if (item) items.push(item);
  }

  if (includeOptionalAddOns) {
    for (const row of parseJsonArray(addOns)) {
      const item = rowToQuoteItem(row);
      if (item) items.push(item);
    }
  }

  return items;
}
