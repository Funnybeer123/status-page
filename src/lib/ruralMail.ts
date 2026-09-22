export type MailBox = {
  id: string;
  person: string;
  boxNumber: string;
};

export function mailBoxLine(person?: string | null, boxNumber?: string | null) {
  const who = person?.trim() || "A box";
  const num = boxNumber?.trim();
  return num ? `Box ${num} · ${who}` : who;
}

export function mailRouteHeading(name?: string | null, carrier?: string | null, days?: string | null) {
  const route = name?.trim() || "Rural route";
  const who = carrier?.trim();
  const when = days?.trim();
  if (who && when) return `${route} · ${who} · ${when}`;
  if (who) return `${route} · ${who}`;
  return route;
}

export function mailRoutesHeading(count: number) {
  if (!count) return "No rural mail routes yet";
  if (count === 1) return "1 rural mail route";
  return `${count} rural mail routes`;
}

export function missingMailHeading(count: number) {
  return count ? "The rural mail route is still empty" : "The rural mail route already has a box";
}

export function compileMailBoxes(rows: MailBox[]) {
  return [...rows].sort((a, b) => a.boxNumber.localeCompare(b.boxNumber, undefined, { numeric: true }) || a.person.localeCompare(b.person));
}
