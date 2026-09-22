export function clippingPageHeading(title: string) {
  const name = title.trim() || "This clipping";
  return `Newspaper page · ${name}`;
}

export function clippingPageLine(title?: string | null) {
  return title?.trim() || "The newspaper page";
}

export function clippingHasPage(clipping?: { assetId?: string | null; asset?: { id?: string } | null } | null) {
  return Boolean(clipping?.assetId || clipping?.asset?.id);
}
