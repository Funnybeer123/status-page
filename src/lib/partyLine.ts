export type PartyLineRow = {
  id: string;
  exchange: string;
  number: string;
  people: string[];
};

export function partyLineNumber(exchange?: string | null, number?: string | null) {
  const ex = exchange?.trim() || "exchange";
  const num = number?.trim() || "number";
  return `${ex} ${num}`;
}

export function partyLineLine(exchange?: string | null, number?: string | null, people?: string[] | null) {
  const phone = partyLineNumber(exchange, number);
  const names = (people || []).filter(Boolean).join(", ");
  return names ? `${phone} · ${names}` : phone;
}

export function partyLinesHeading(count: number) {
  if (!count) return "No party lines yet";
  if (count === 1) return "1 party line";
  return `${count} party lines`;
}

export function missingPartyLinesHeading(count: number) {
  return count ? "No party line has been written down" : "A party line is already written down";
}

export function compilePartyLines(rows: PartyLineRow[]) {
  return [...rows].sort(
    (a, b) => partyLineNumber(a.exchange, a.number).localeCompare(partyLineNumber(b.exchange, b.number)),
  );
}
