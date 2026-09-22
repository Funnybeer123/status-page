function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type SmokehouseRow = {
  id: string;
  person: string;
  item: string;
  hungOn?: Date | string | null;
};

export function smokehouseLine(item?: string | null, person?: string | null, hungOn?: string | null) {
  const hanging = item?.trim() || "meat";
  const whose = person?.trim() || "the family";
  const day = hungOn?.trim();
  const base = `${hanging} · ${whose}`;
  return day && day !== "9999-12-31" ? `${base} · ${day}` : base;
}

export function smokehouseHeading(count: number) {
  if (!count) return "No smokehouse inventory yet";
  if (count === 1) return "1 smokehouse item";
  return `${count} smokehouse items`;
}

export function missingSmokehouseHeading(count: number) {
  return count ? "No smokehouse inventory has been written down" : "A smokehouse inventory is already written down";
}

export function compileSmokehouse(rows: SmokehouseRow[]) {
  return [...rows]
    .map((row) => ({ ...row, hungKey: isoKey(row.hungOn) }))
    .sort((a, b) => a.hungKey.localeCompare(b.hungKey) || a.item.localeCompare(b.item) || a.person.localeCompare(b.person));
}
