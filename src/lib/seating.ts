export function seatingHeading(title: string, count: number) {
  const reunion = title.trim() || "This reunion";
  if (!count) return `Seating chart for ${reunion}`;
  if (count === 1) return `Seating chart for ${reunion} · 1 seat`;
  return `Seating chart for ${reunion} · ${count} seats`;
}

export function seatLine(name: string, tableName: string, seat?: number | null) {
  const who = name.trim() || "A guest";
  const table = tableName.trim() || "a table";
  return seat != null ? `${who} · ${table}, seat ${seat}` : `${who} · ${table}`;
}

export function groupSeats<T extends { tableName: string }>(rows: T[]) {
  const tables = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.tableName.trim() || "Table";
    const list = tables.get(key) ?? [];
    list.push(row);
    tables.set(key, list);
  }
  return [...tables.entries()].map(([tableName, seats]) => ({ tableName, seats }));
}

export function missingSeatingHeading(count: number) {
  if (!count) return "Every reunion has a seating chart";
  if (count === 1) return "1 reunion still needs a seating chart";
  return `${count} reunions still need a seating chart`;
}
