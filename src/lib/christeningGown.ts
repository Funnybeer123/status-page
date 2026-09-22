export type GownWear = {
  id: string;
  person: string;
  personId: string;
  wornOn?: Date | string | null;
};

function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export function gownWearLine(person?: string | null, wornOn?: string | null) {
  const who = person?.trim() || "A child";
  const when = wornOn?.trim();
  return when && when !== "9999-12-31" ? `${who} · ${when}` : who;
}

export function gownHeading(title?: string | null, count = 0) {
  const name = title?.trim() || "This gown";
  if (!count) return `${name} · no wearers yet`;
  if (count === 1) return `${name} · 1 wearer`;
  return `${name} · ${count} wearers`;
}

export function gownsHeading(count: number) {
  if (!count) return "No christening gowns yet";
  if (count === 1) return "1 christening gown";
  return `${count} christening gowns`;
}

export function missingGownsHeading(count: number) {
  if (!count) return "Every gown already has a wearer";
  if (count === 1) return "1 gown still needs a wearer";
  return `${count} gowns still need a wearer`;
}

export function compileGownChain(wears: GownWear[]) {
  return [...wears]
    .map((wear) => ({ ...wear, wornKey: isoKey(wear.wornOn) }))
    .sort((a, b) => a.wornKey.localeCompare(b.wornKey) || a.person.localeCompare(b.person));
}
