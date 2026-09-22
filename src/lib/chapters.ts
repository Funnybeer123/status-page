export type ChapterKind = "childhood" | "work" | "later" | "custom";

export type ChapterRange = {
  id: string;
  kind: ChapterKind | string;
  title: string;
  startedOn?: Date | string | null;
  endedOn?: Date | string | null;
  notes?: string | null;
};

export type DatedItem = {
  id: string;
  kind: "story" | "photo" | "letter" | "event";
  title: string;
  happenedOn?: Date | string | null;
  href: string;
  body?: string | null;
};

export type LifeChapterView = ChapterRange & { items: DatedItem[] };

function asDate(value?: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

function addYears(date: Date, years: number) {
  return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()));
}

function isoDay(value?: Date | string | null) {
  const date = asDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

export function defaultChapterRanges(
  birth?: Date | string | null,
  death?: Date | string | null,
): ChapterRange[] {
  const born = asDate(birth);
  const died = asDate(death);
  if (!born) {
    return [
      { id: "childhood", kind: "childhood", title: "Childhood", startedOn: null, endedOn: null },
      { id: "work", kind: "work", title: "Work years", startedOn: null, endedOn: null },
      { id: "later", kind: "later", title: "Later years", startedOn: null, endedOn: null },
    ];
  }
  const childhoodEnd = addYears(born, 18);
  const workEnd = addYears(born, 65);
  return [
    {
      id: "childhood",
      kind: "childhood",
      title: "Childhood",
      startedOn: born,
      endedOn: died && died < childhoodEnd ? died : childhoodEnd,
    },
    {
      id: "work",
      kind: "work",
      title: "Work years",
      startedOn: childhoodEnd,
      endedOn: died && died < workEnd ? died : workEnd,
    },
    {
      id: "later",
      kind: "later",
      title: "Later years",
      startedOn: workEnd,
      endedOn: died,
    },
  ];
}

export function isChapterKind(value?: string | null): value is ChapterKind {
  return value === "childhood" || value === "work" || value === "later" || value === "custom";
}

export function normalizeChapterKind(value?: string | null): ChapterKind {
  return isChapterKind(value) ? value : "custom";
}

export function inChapterRange(
  when: Date | string | null | undefined,
  start?: Date | string | null,
  end?: Date | string | null,
  kind: ChapterKind | string = "custom",
) {
  const date = asDate(when);
  if (!date) return false;
  const from = asDate(start);
  const to = asDate(end);
  if (from && date.getTime() < from.getTime()) return false;
  if (to && kind !== "later" && date.getTime() >= to.getTime()) return false;
  if (to && kind === "later" && date.getTime() > to.getTime()) return false;
  return true;
}

export function chapterForItem(chapters: ChapterRange[], item: DatedItem): string {
  const dated = chapters.filter((chapter) => chapter.startedOn || chapter.endedOn);
  const customs = dated.filter((chapter) => chapter.kind === "custom");
  for (const chapter of customs) {
    if (inChapterRange(item.happenedOn, chapter.startedOn, chapter.endedOn, chapter.kind)) {
      return chapter.id;
    }
  }
  for (const chapter of dated.filter((row) => row.kind !== "custom")) {
    if (inChapterRange(item.happenedOn, chapter.startedOn, chapter.endedOn, chapter.kind)) {
      return chapter.id;
    }
  }
  if (!item.happenedOn) {
    return chapters.find((chapter) => chapter.kind === "work")?.id || chapters[0]?.id || "work";
  }
  return chapters.find((chapter) => chapter.kind === "later")?.id || chapters[chapters.length - 1]?.id || "later";
}

export function compileLifeChapters(input: {
  birthDate?: Date | string | null;
  deathDate?: Date | string | null;
  named?: ChapterRange[];
  items: DatedItem[];
}): LifeChapterView[] {
  const defaults = defaultChapterRanges(input.birthDate, input.deathDate);
  const named = (input.named ?? []).map((item) => ({
    ...item,
    kind: normalizeChapterKind(item.kind),
  }));
  const chapters: ChapterRange[] = defaults.map((row) => {
    const override = named.find((item) => item.kind === row.kind);
    if (!override) return row;
    return {
      ...row,
      id: override.id || row.id,
      title: override.title || row.title,
      startedOn: override.startedOn ?? row.startedOn,
      endedOn: override.endedOn ?? row.endedOn,
      notes: override.notes ?? row.notes,
    };
  });
  for (const extra of named.filter((item) => item.kind === "custom")) {
    chapters.push({
      ...extra,
      id: extra.id || `custom-${extra.title}`,
      title: extra.title,
    });
  }
  return chapters.map((chapter) => ({
    ...chapter,
    startedOn: isoDay(chapter.startedOn),
    endedOn: isoDay(chapter.endedOn),
    items: input.items.filter((item) => chapterForItem(chapters, item) === chapter.id),
  }));
}

export function chapterHeading(chapter: Pick<LifeChapterView, "title" | "items">) {
  if (!chapter.items.length) return chapter.title;
  if (chapter.items.length === 1) return `${chapter.title} · 1 piece`;
  return `${chapter.title} · ${chapter.items.length} pieces`;
}
