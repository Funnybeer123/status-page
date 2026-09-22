export type TaxName = {
  id: string;
  name: string;
  personId?: string | null;
  amount?: string | null;
  notes?: string | null;
};

export function compileTaxNames(names: TaxName[]) {
  return [...names].sort((a, b) => a.name.localeCompare(b.name));
}

export function taxListHeading(place: string, year: number) {
  return `${place}, ${year}`;
}

export function taxNameLine(name: TaxName) {
  const bits = [name.name];
  if (name.amount) bits.push(name.amount);
  if (name.notes) bits.push(name.notes);
  return bits.join(" · ");
}

export function taxListCount(names: TaxName[]) {
  return names.length === 1 ? "1 name" : `${names.length} names`;
}
