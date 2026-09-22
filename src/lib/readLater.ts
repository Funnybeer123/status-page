export function readLaterHeading(count: number) {
  if (!count) return "Nothing on the read-later shelf";
  if (count === 1) return "Read later · 1 letter or story";
  return `Read later · ${count} letters and stories`;
}

export function emptyShelfHeading() {
  return "The read-later shelf is empty";
}

export function readLaterLine(title?: string | null, kind?: string | null) {
  const name = title?.trim() || "Untitled";
  const what = kind === "story" ? "story" : "letter";
  return `${name} · ${what}`;
}

export function compileReadLater<
  T extends {
    id: string;
    createdAt?: Date | string | null;
    document?: { id: string; title: string } | null;
    story?: { id: string; title: string } | null;
  },
>(rows: T[]) {
  return [...rows]
    .sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).toISOString() : "9999-";
      const right = b.createdAt ? new Date(b.createdAt).toISOString() : "9999-";
      return right.localeCompare(left);
    })
    .map((row) => {
      const kind = row.story ? "story" : "letter";
      const title = row.story?.title || row.document?.title || "Untitled";
      const href = row.story ? `/stories/${row.story.id}` : `/letters/${row.document?.id}`;
      return {
        id: row.id,
        title,
        kind,
        href,
        line: readLaterLine(title, kind),
      };
    });
}
