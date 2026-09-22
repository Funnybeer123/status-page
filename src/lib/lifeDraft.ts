export function lifeDraftHeading(name: string) {
  return `Draft life story for ${name.trim() || "this person"}`;
}

export function lifeDraftAskQuestion(name: string) {
  const who = name.trim() || "this person";
  return `What do the letters and stories say about ${who}?`;
}

export function mergeDraftBody(current: string, addition: string) {
  const left = current.trim();
  const right = addition.trim();
  if (!left) return right;
  if (!right) return left;
  if (left.includes(right)) return left;
  return `${left}\n\n${right}`;
}

export function compileLifeDraftFill(input: {
  name: string;
  letters: { title: string; excerpt: string }[];
  stories: { title: string; excerpt: string }[];
}) {
  const parts: string[] = [];
  for (const letter of input.letters) {
    parts.push(`From ${letter.title}: ${letter.excerpt.trim()}`);
  }
  for (const story of input.stories) {
    parts.push(`From ${story.title}: ${story.excerpt.trim()}`);
  }
  return {
    title: lifeDraftHeading(input.name),
    body: parts.join("\n\n") || `Start a life story for ${input.name.trim() || "this person"}.`,
  };
}

export function emptyLifeDraftsHeading(count: number) {
  if (!count) return "Every life draft has words from the archive";
  if (count === 1) return "1 life draft is still empty";
  return `${count} life drafts are still empty`;
}

export function isEmptyDraft(body?: string | null) {
  return !body?.trim();
}
