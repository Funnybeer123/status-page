export const USUAL_DOCUMENT_TYPES = [
  { kind: "birth", title: "Birth certificate" },
  { kind: "marriage", title: "Marriage record" },
  { kind: "death", title: "Death certificate" },
  { kind: "census", title: "Census" },
  { kind: "obituary", title: "Obituary" },
  { kind: "will", title: "Will" },
  { kind: "letter", title: "Letter" },
  { kind: "photo", title: "Photograph" },
] as const;

export type UsualDocumentKind = (typeof USUAL_DOCUMENT_TYPES)[number]["kind"];

export function usualDocumentTypes() {
  return USUAL_DOCUMENT_TYPES.map((item) => ({ ...item }));
}

export function checklistHeading(done: number, total = USUAL_DOCUMENT_TYPES.length) {
  if (!total) return "Research checklist";
  if (!done) return `Research checklist — ${total} usual document types`;
  if (done >= total) return "Research checklist — every usual document is marked";
  return `Research checklist — ${done} of ${total} usual documents`;
}

export function checklistItemLine(title: string, done: boolean) {
  return done ? `${title} · found` : `${title} · still to find`;
}

export function uncheckedItemsHeading(count: number) {
  if (!count) return "Every usual document type is marked";
  if (count === 1) return "1 usual document type still open";
  return `${count} usual document types still open`;
}

export function mergeUsualItems<T extends { kind: string; title: string; doneAt?: Date | string | null }>(existing: T[]) {
  const byKind = new Map(existing.map((item) => [item.kind, item]));
  return usualDocumentTypes().map((usual) => {
    const row = byKind.get(usual.kind);
    return {
      kind: usual.kind,
      title: row?.title || usual.title,
      doneAt: row?.doneAt ?? null,
    };
  });
}
