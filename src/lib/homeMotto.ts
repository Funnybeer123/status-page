export type MottoRow = {
  id: string;
  text: string;
  language?: string | null;
  notes?: string | null;
  preferred?: boolean | null;
};

export function pickHomeMotto<T extends MottoRow>(mottos: T[]) {
  if (!mottos.length) return null;
  return mottos.find((motto) => motto.preferred) ?? mottos[0] ?? null;
}

export function homeMottoHeading() {
  return "Family motto";
}

export function missingMottoHeading(count: number) {
  if (!count) return "The family motto is on the home page";
  return "The family home still needs a motto";
}
