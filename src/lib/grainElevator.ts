export type ElevatorRow = {
  id: string;
  person: string;
  elevator: string;
  account: string;
  year?: number | null;
};

export function elevatorLine(person?: string | null, elevator?: string | null, account?: string | null, year?: number | null) {
  const who = person?.trim() || "A farmer";
  const house = elevator?.trim() || "elevator";
  const book = account?.trim() || "account";
  const when = year != null ? String(year) : "";
  return when ? `${who} · ${house} · ${book} · ${when}` : `${who} · ${house} · ${book}`;
}

export function elevatorsHeading(count: number) {
  if (!count) return "No grain-elevator accounts yet";
  if (count === 1) return "1 grain-elevator account";
  return `${count} grain-elevator accounts`;
}

export function missingElevatorsHeading(count: number) {
  return count ? "No grain-elevator account has been written down" : "A grain-elevator account is already written down";
}

export function compileElevators(rows: ElevatorRow[]) {
  return [...rows].sort(
    (a, b) =>
      a.elevator.localeCompare(b.elevator) ||
      String(a.year ?? 9999).localeCompare(String(b.year ?? 9999)) ||
      a.person.localeCompare(b.person),
  );
}
