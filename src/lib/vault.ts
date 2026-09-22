export function vaultHeading(count: number) {
  if (!count) return "The family vault is empty";
  if (count === 1) return "1 shared account note";
  return `${count} shared account notes`;
}

export function vaultDenied() {
  return "Only an owner can open the family vault.";
}

export function vaultLine(title?: string | null) {
  return title?.trim() || "A shared account note";
}

export function emptyVaultHeading() {
  return "No shared account notes yet";
}
