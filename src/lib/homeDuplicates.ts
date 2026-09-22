export type HomeRow = {
  id: string;
  title: string;
  line?: string | null;
  locality?: string | null;
};

function key(home: HomeRow) {
  const line = (home.line || "").trim().toLowerCase();
  const town = (home.locality || "").trim().toLowerCase();
  if (line && town) return `addr:${line}|${town}`;
  return `title:${home.title.trim().toLowerCase()}`;
}

export function suggestHomeDuplicates(homes: HomeRow[]) {
  const groups = new Map<string, HomeRow[]>();
  for (const home of homes) {
    const list = groups.get(key(home)) ?? [];
    list.push(home);
    groups.set(key(home), list);
  }
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({ keep: group[0]!, drop: group.slice(1) }));
}

export function homeDuplicateHeading(count: number) {
  if (!count) return "No duplicate houses";
  if (count === 1) return "1 house looks duplicated";
  return `${count} houses look duplicated`;
}

export function mergeHomesHeading(keep: string, drop: string) {
  return `Merge ${drop} into ${keep}`;
}
