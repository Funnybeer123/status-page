export function webcalHeading(familyName: string) {
  return `${familyName} family dates`;
}

export function webcalHref(token: string, origin?: string) {
  const path = `/api/cal/${token}`;
  if (!origin) return path;
  return origin.replace(/^https?:/, "webcal:") + path;
}

export function branchGedcomHeading(branch: string) {
  return `GEDCOM · ${branch}`;
}

export function branchGedcomFilename(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "branch"}.ged`;
}
