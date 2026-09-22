export function adoptionHeading(childName: string, parentName: string) {
  return `Adoption paper · ${childName} and ${parentName}`;
}

export function adoptionLine(childName: string, parentName: string, grantedOn?: string | null) {
  return grantedOn ? `${childName} adopted by ${parentName} · ${grantedOn}` : `${childName} adopted by ${parentName}`;
}
