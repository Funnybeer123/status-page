export function shopHeading(title?: string | null, count = 0) {
  const name = title?.trim() || "the reunion";
  if (!count) return `Shopping list · ${name}`;
  if (count === 1) return `Shopping list · ${name} · 1 item`;
  return `Shopping list · ${name} · ${count} items`;
}

export function shopItemLine(label?: string | null, quantity?: number | null) {
  const item = label?.trim() || "An unnamed item";
  if (quantity == null || !Number.isFinite(quantity)) return item;
  return `${item} · ${quantity}`;
}

export function missingShopHeading(count: number) {
  if (!count) return "Every reunion has a shopping list";
  if (count === 1) return "1 reunion still needs plates, chairs, or name tags";
  return `${count} reunions still need plates, chairs, or name tags`;
}

export function compileShopList<T extends { label: string; quantity?: number | null; notes?: string | null }>(items: T[]) {
  return [...items]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((item) => ({
      ...item,
      line: shopItemLine(item.label, item.quantity),
    }));
}
