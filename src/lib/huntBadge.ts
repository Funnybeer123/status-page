export function huntBadgeLine(name: string, huntTitle: string) {
  return `${name.trim() || "A relative"} finished ${huntTitle.trim() || "the scavenger hunt"}`;
}

export function huntBadgesHeading(count: number) {
  if (!count) return "No one has finished a scavenger hunt yet";
  if (count === 1) return "1 scavenger hunt badge";
  return `${count} scavenger hunt badges`;
}

export function unfinishedHuntsHeading(count: number) {
  if (!count) return "Every hunt has a finisher";
  if (count === 1) return "1 hunt still needs a finisher";
  return `${count} hunts still need a finisher`;
}

export function huntFinishersHeading(count: number) {
  if (!count) return "No badges on this hunt yet";
  if (count === 1) return "1 relative finished this hunt";
  return `${count} relatives finished this hunt`;
}
