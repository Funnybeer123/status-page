export type MonthDay = {
  date: string;
  day: number;
  inMonth: boolean;
  items: { id: string; title: string; personId: string }[];
};

export function monthGrid(
  year: number,
  month: number,
  items: { id: string; title: string; personId: string; happenedOn: Date | string }[],
): MonthDay[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prevDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const cells: MonthDay[] = [];

  const byDay = new Map<number, MonthDay["items"]>();
  for (const item of items) {
    const date = typeof item.happenedOn === "string" ? new Date(item.happenedOn) : item.happenedOn;
    if (Number.isNaN(date.getTime())) continue;
    if (date.getUTCMonth() + 1 !== month) continue;
    const day = date.getUTCDate();
    const list = byDay.get(day) ?? [];
    list.push({ id: item.id, title: item.title, personId: item.personId });
    byDay.set(day, list);
  }

  for (let i = 0; i < startWeekday; i += 1) {
    const day = prevDays - startWeekday + 1 + i;
    const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    cells.push({
      date: `${prev.year}-${String(prev.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      inMonth: false,
      items: [],
    });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      inMonth: true,
      items: byDay.get(day) ?? [],
    });
  }
  while (cells.length % 7 !== 0) {
    const day = cells.length - (startWeekday + daysInMonth) + 1;
    const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    cells.push({
      date: `${next.year}-${String(next.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      inMonth: false,
      items: [],
    });
  }
  return cells;
}

export function monthTitle(year: number, month: number) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}
