export function nameTagHeading(reunion: string, count: number) {
  if (!count) return `No name tags yet for ${reunion}`;
  if (count === 1) return `1 name tag for ${reunion}`;
  return `${count} name tags for ${reunion}`;
}

export function nameTagLine(name: string, reunion: string) {
  return `${name} · ${reunion}`;
}
