export function landAbstractLine(input: {
  title: string;
  place?: string | null;
  homeTitle?: string | null;
  abstract?: string | null;
}) {
  const place = input.homeTitle || input.place;
  const head = place ? `${input.title} at ${place}` : input.title;
  return input.abstract ? `${head} — ${input.abstract}` : head;
}

export function hasLandAbstract(record?: { abstract?: string | null } | null) {
  return Boolean(record?.abstract?.trim());
}
