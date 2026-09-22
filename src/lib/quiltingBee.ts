function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type BeeBlock = {
  id: string;
  person: string;
  personId: string;
  block: string;
};

export function quiltingBlockLine(person?: string | null, block?: string | null) {
  const who = person?.trim() || "A stitcher";
  const piece = block?.trim() || "a block";
  return `${who} · ${piece}`;
}

export function quiltingBeeHeading(title?: string | null, count = 0) {
  const name = title?.trim() || "This quilting bee";
  if (!count) return `${name} · no blocks yet`;
  if (count === 1) return `${name} · 1 block`;
  return `${name} · ${count} blocks`;
}

export function quiltingBeesHeading(count: number) {
  if (!count) return "No quilting bees yet";
  if (count === 1) return "1 quilting bee";
  return `${count} quilting bees`;
}

export function missingBeesHeading(count: number) {
  if (!count) return "Every quilting bee already has a block";
  if (count === 1) return "1 quilting bee still needs a block";
  return `${count} quilting bees still need a block`;
}

export function compileBeeBlocks(rows: BeeBlock[]) {
  return [...rows].sort((a, b) => a.person.localeCompare(b.person) || a.block.localeCompare(b.block));
}

export function compileBees<T extends { heldOn?: Date | string | null; title: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) => isoKey(a.heldOn).localeCompare(isoKey(b.heldOn)) || a.title.localeCompare(b.title),
  );
}
