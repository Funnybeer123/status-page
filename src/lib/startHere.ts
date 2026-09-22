export type StartStep = { id: "claim" | "story" | "photo"; title: string; done: boolean; href: string };

export function startSteps(input: { claimed: boolean; hasStory: boolean; hasPhoto: boolean }) {
  return [
    { id: "claim" as const, title: "Claim yourself on the tree", done: input.claimed, href: "/me" },
    { id: "story" as const, title: "Add one story", done: input.hasStory, href: "/stories" },
    { id: "photo" as const, title: "Upload one photograph", done: input.hasPhoto, href: "/archive" },
  ];
}

export function startHeading(steps: StartStep[]) {
  const done = steps.filter((step) => step.done).length;
  if (done === steps.length) return "You’re in. The archive is yours to keep.";
  if (!done) return "Start here";
  return `${done} of ${steps.length} first steps done`;
}

export function peopleNeedingFirst(
  people: { id: string; displayName: string }[],
  haveIds: string[],
) {
  const have = new Set(haveIds);
  return people.filter((person) => !have.has(person.id)).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function neededHeading(stories: number, photos: number) {
  return `${stories} still need a story · ${photos} still need a photograph`;
}
