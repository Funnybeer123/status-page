import { formatDate, lifespan } from "@/lib/dates";

export function funeralHeading(name: string) {
  return `In memory of ${name.trim() || "this person"}`;
}

export function funeralDates(birth?: Date | string | null, death?: Date | string | null) {
  const span = lifespan(birth, death);
  const born = formatDate(birth, "");
  const died = formatDate(death, "");
  if (born && died) return `${span} · Born ${born} · Died ${died}`;
  if (died) return `Died ${died}`;
  return span || "Dates unknown";
}

export function funeralLife(notes?: string | null, letter?: string | null) {
  const note = notes?.replace(/\s+/g, " ").trim();
  const excerpt = letter?.replace(/\s+/g, " ").trim().slice(0, 420);
  if (note && excerpt) return `${note} ${excerpt}`;
  return note || excerpt || "A short life still waiting to be written.";
}

export function missingFuneralPortraitHeading(count: number) {
  if (!count) return "Every funeral program has a portrait";
  if (count === 1) return "1 funeral program still needs a portrait";
  return `${count} funeral programs still need a portrait`;
}

export function funeralsHeading(count: number) {
  if (!count) return "No funeral programs yet";
  if (count === 1) return "1 funeral program";
  return `${count} funeral programs`;
}
