import { decadeOf, groupByDecade } from "@/lib/decades";

export function decadeFolderHeading(decade: number | "undated") {
  return decade === "undated" ? "Undated folder" : `${decade}s folder`;
}

export function archiveFoldersHeading(count: number) {
  if (!count) return "No decade folders yet";
  if (count === 1) return "1 decade folder";
  return `${count} decade folders`;
}

export function undatedFolderHeading(count: number) {
  if (!count) return "Every archive item has a decade";
  if (count === 1) return "1 archive item still needs a date";
  return `${count} archive items still need a date`;
}

export function compileArchiveFolders<
  T extends { id: string; title?: string | null; capturedAt?: Date | string | null },
>(items: T[]) {
  return groupByDecade(items.map((item) => ({ ...item, happenedOn: item.capturedAt }))).map(([decade, rows]) => ({
    decade,
    heading: decadeFolderHeading(decade),
    items: rows.map((row) => ({
      id: row.id,
      title: row.title || "Untitled",
      href: `/archive/${row.id}`,
    })),
  }));
}

export function folderDecadeOf(value?: Date | string | null) {
  return decadeOf(value);
}
