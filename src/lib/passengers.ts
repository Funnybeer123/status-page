export type Passenger = {
  personId: string;
  name: string;
  age?: number | null;
  role?: string | null;
  notes?: string | null;
};

export function compilePassengerList(people: Passenger[]) {
  return [...people].sort((a, b) => a.name.localeCompare(b.name));
}

export function passengerLine(person: Passenger) {
  const bits = [person.name];
  if (person.age != null) bits.push(`age ${person.age}`);
  if (person.role) bits.push(person.role);
  if (person.notes) bits.push(person.notes);
  return bits.join(" · ");
}

export function voyagePassengerHeading(ship: string, count: number) {
  if (count === 1) return `${ship} · 1 passenger`;
  return `${ship} · ${count} passengers`;
}
