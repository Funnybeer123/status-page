export function restoreHeading(title?: string | null) {
  const name = title?.trim();
  return name ? `Restoration pair · ${name}` : "Restoration pair";
}

export function restorePairHeading(count: number) {
  if (!count) return "No restoration pairs yet";
  if (count === 1) return "1 restoration pair";
  return `${count} restoration pairs`;
}

export function originalScanLabel() {
  return "Original scan";
}

export function cleanedCopyLabel() {
  return "Cleaned copy";
}

export function restoreLine(title?: string | null) {
  return title?.trim() || "A restored photograph";
}
