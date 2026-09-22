function isoKey(value?: Date | string | null) {
  if (!value) return "9999-12-31";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "9999-12-31";
  return date.toISOString().slice(0, 10);
}

export type SocialRow = {
  id: string;
  buyer: string;
  seller: string;
  heldOn?: Date | string | null;
  price?: string | null;
};

export function boxSocialLine(buyer?: string | null, seller?: string | null, price?: string | null) {
  const who = buyer?.trim() || "A buyer";
  const whose = seller?.trim() || "a box";
  const cost = price?.trim();
  return cost ? `${who} bought ${whose}’s box · ${cost}` : `${who} bought ${whose}’s box`;
}

export function boxSocialsHeading(count: number) {
  if (!count) return "No box-social pairings yet";
  if (count === 1) return "1 box-social pairing";
  return `${count} box-social pairings`;
}

export function missingSocialsHeading(count: number) {
  return count ? "No box-social pairing has been written down" : "A box-social pairing is already written down";
}

export function compileSocials(rows: SocialRow[]) {
  return [...rows]
    .map((row) => ({ ...row, heldKey: isoKey(row.heldOn) }))
    .sort((a, b) => a.heldKey.localeCompare(b.heldKey) || a.buyer.localeCompare(b.buyer));
}
