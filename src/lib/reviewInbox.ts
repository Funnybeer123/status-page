import type { UncitedRow } from "@/lib/uncited";
import type { DuplicatePair } from "@/lib/duplicates";
import type { PlacedTag } from "@/lib/whoWhere";

export type ReviewKind = "ocr" | "uncited" | "unlocated" | "duplicate";

export type ReviewItem = {
  id: string;
  kind: ReviewKind;
  title: string;
  reason: string;
  href: string;
};

export function compileReviewInbox(input: {
  ocr?: { id: string; title: string }[];
  uncited?: UncitedRow[];
  unlocated?: (PlacedTag & { assetTitle?: string | null; assetId?: string })[];
  duplicates?: DuplicatePair[];
}): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const doc of input.ocr ?? []) {
    items.push({
      id: `ocr-${doc.id}`,
      kind: "ocr",
      title: doc.title,
      reason: "OCR to check",
      href: `/letters/${doc.id}`,
    });
  }
  for (const row of input.uncited ?? []) {
    items.push({
      id: `uncited-${row.id}`,
      kind: "uncited",
      title: `${row.name} · ${row.kind}`,
      reason: row.reason,
      href: row.href || "/uncited",
    });
  }
  for (const tag of input.unlocated ?? []) {
    items.push({
      id: `unlocated-${tag.id}`,
      kind: "unlocated",
      title: tag.assetTitle ? `${tag.name} on ${tag.assetTitle}` : tag.name,
      reason: "A face is named, but not placed on the picture.",
      href: tag.assetId ? `/archive/${tag.assetId}` : "/photos/unlocated",
    });
  }
  for (const pair of input.duplicates ?? []) {
    items.push({
      id: `dup-${pair.keepId}-${pair.dropId}`,
      kind: "duplicate",
      title: `${pair.keepName} and ${pair.dropName}`,
      reason: `Suggested duplicate (${pair.score})`,
      href: "/duplicates",
    });
  }
  const order: ReviewKind[] = ["ocr", "uncited", "unlocated", "duplicate"];
  return items.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.title.localeCompare(b.title));
}

export function inboxHeading(count: number) {
  if (!count) return "Nothing needs a look";
  if (count === 1) return "One thing needs a look";
  return `${count} things need a look`;
}

export function inboxKindLabel(kind: ReviewKind) {
  if (kind === "ocr") return "OCR to check";
  if (kind === "uncited") return "Uncited fact";
  if (kind === "unlocated") return "Unlocated face";
  return "Suggested duplicate";
}
