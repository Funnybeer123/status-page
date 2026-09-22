export function boxHeading(count: number) {
  if (!count) return "Nothing left in the unsorted box";
  if (count === 1) return "1 upload not filed to a person yet";
  return `${count} uploads not filed to a person yet`;
}

export function boxFileLine(title: string, name: string) {
  const item = title.trim() || "This upload";
  const who = name.trim() || "someone";
  return `${item} filed onto ${who}`;
}

export function boxItemLine(title?: string | null) {
  return title?.trim() || "An untitled upload";
}

export function isUnsorted(asset: { tags?: { personId?: string }[] | null }) {
  return !(asset.tags && asset.tags.length);
}

export function boxFileManyLine(count: number, name: string) {
  const who = name.trim() || "someone";
  if (!count) return `No uploads filed onto ${who}`;
  if (count === 1) return `1 upload filed onto ${who}`;
  return `${count} uploads filed onto ${who}`;
}
