export function proofBoardHeading(claim?: string | null) {
  const text = claim?.replace(/\s+/g, " ").trim();
  return text ? `Proof board · ${text}` : "Proof board";
}

export function proofListHeading(count: number) {
  if (!count) return "No facts on the proof boards yet";
  if (count === 1) return "1 fact on the proof boards";
  return `${count} facts on the proof boards`;
}

export function bareProofHeading(count: number) {
  if (!count) return "Every fact has a supporting image";
  if (count === 1) return "1 fact still needs a supporting image";
  return `${count} facts still need a supporting image`;
}

export function sameClaim(a?: string | null, b?: string | null) {
  return (a || "").replace(/\s+/g, " ").trim().toLowerCase() === (b || "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function proofHasImage(item: {
  assetId?: string | null;
  asset?: { id?: string | null; mimeType?: string | null; kind?: string | null } | null;
  document?: { assetId?: string | null; asset?: { id?: string | null } | null } | null;
}) {
  if (item.assetId || item.asset?.id) return true;
  if (item.document?.assetId || item.document?.asset?.id) return true;
  if (item.asset?.kind === "photo" || item.asset?.mimeType?.startsWith("image/")) return true;
  return false;
}

export function compileProofBoard<
  T extends {
    id: string;
    claim: string;
    assetId?: string | null;
    documentId?: string | null;
    asset?: { id?: string | null; title?: string | null; storagePath?: string | null; mimeType?: string | null; kind?: string | null } | null;
    document?: { id?: string | null; title?: string | null; assetId?: string | null; asset?: { id?: string | null; title?: string | null; storagePath?: string | null } | null } | null;
  },
>(primary: T, others: T[]) {
  const citations = [primary, ...others.filter((item) => item.id !== primary.id && sameClaim(item.claim, primary.claim))];
  const images: { id: string; title: string; storagePath?: string | null; href: string }[] = [];
  const seen = new Set<string>();
  for (const item of citations) {
    const asset = item.asset;
    if (asset?.id && !seen.has(asset.id)) {
      seen.add(asset.id);
      images.push({
        id: asset.id,
        title: asset.title || "A supporting photograph",
        storagePath: asset.storagePath,
        href: `/archive/${asset.id}`,
      });
    }
    const page = item.document?.asset;
    if (page?.id && !seen.has(page.id)) {
      seen.add(page.id);
      images.push({
        id: page.id,
        title: page.title || item.document?.title || "A supporting page",
        storagePath: page.storagePath,
        href: item.document?.id ? `/letters/${item.document.id}` : `/archive/${page.id}`,
      });
    }
  }
  return { citations, images, hasImage: images.length > 0 };
}
