export type ButterRow = {
  id: string;
  person: string;
  store: string;
  account: string;
  year?: number | null;
};

export function butterEggLine(person?: string | null, store?: string | null, account?: string | null, year?: number | null) {
  const who = person?.trim() || "A farm";
  const house = store?.trim() || "the store";
  const book = account?.trim() || "account";
  const when = year != null ? String(year) : "";
  return when ? `${who} · ${house} · ${book} · ${when}` : `${who} · ${house} · ${book}`;
}

export function butterEggsHeading(count: number) {
  if (!count) return "No butter-and-egg accounts yet";
  if (count === 1) return "1 butter-and-egg account";
  return `${count} butter-and-egg accounts`;
}

export function missingButterHeading(count: number) {
  return count ? "No butter-and-egg account has been written down" : "A butter-and-egg account is already written down";
}

export function compileButterEggs(rows: ButterRow[]) {
  return [...rows].sort(
    (a, b) => a.store.localeCompare(b.store) || String(a.year ?? 9999).localeCompare(String(b.year ?? 9999)) || a.person.localeCompare(b.person),
  );
}
