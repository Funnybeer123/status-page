export type InventoryRow = {
  id: string;
  title: string;
  hasScan: boolean;
  replies: number;
  status: string;
};

export function compileLetterInventory(
  letters: { id: string; title: string; assetId?: string | null; replies?: unknown[] | number }[],
): InventoryRow[] {
  return letters.map((letter) => {
    const replies = typeof letter.replies === "number" ? letter.replies : letter.replies?.length ?? 0;
    const hasScan = Boolean(letter.assetId);
    return {
      id: letter.id,
      title: letter.title,
      hasScan,
      replies,
      status: `${hasScan ? "Has a scan" : "No scan yet"} · ${replies ? `${replies} ${replies === 1 ? "reply" : "replies"}` : "no reply"}`,
    };
  });
}
