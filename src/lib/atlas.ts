export function atlasHeading(count: number) {
  if (!count) return "The family atlas is empty";
  if (count === 1) return "1 place in the family atlas";
  return `${count} places in the family atlas`;
}

export function atlasSummary(input: { residents?: number; events?: number; photos?: number }) {
  const parts = [];
  if (input.residents) parts.push(input.residents === 1 ? "1 person lived here" : `${input.residents} people lived here`);
  if (input.events) parts.push(input.events === 1 ? "1 dated event" : `${input.events} dated events`);
  if (input.photos) parts.push(input.photos === 1 ? "1 photograph" : `${input.photos} photographs`);
  return parts.join(" · ") || "Open the chronicle to begin this place.";
}

export function atlasChronicleHref(placeId: string) {
  return `/places/${placeId}`;
}

export function emptyAtlasHeading(count: number) {
  if (!count) return "Every place in the atlas has a summary";
  if (count === 1) return "1 atlas place still needs a summary";
  return `${count} atlas places still need a summary`;
}

export function atlasNeedsSummary(input: { residents?: number; events?: number; photos?: number }) {
  return !input.residents && !input.events && !input.photos;
}
