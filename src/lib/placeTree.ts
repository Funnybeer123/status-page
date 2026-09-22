export type PlaceNode = {
  id: string;
  name: string;
  kind?: string | null;
  parentId?: string | null;
  locality?: string | null;
  region?: string | null;
  country?: string | null;
};

export function normalizePlaceKind(kind?: string | null) {
  const value = (kind || "").trim().toLowerCase();
  if (value === "city" || value === "town" || value === "village") return "city";
  if (value === "county" || value === "parish") return "county";
  if (value === "state" || value === "province") return "state";
  if (value === "country") return "country";
  return value || "place";
}

export function placeKindLabel(kind?: string | null) {
  const normalized = normalizePlaceKind(kind);
  if (normalized === "city") return "City";
  if (normalized === "county") return "County";
  if (normalized === "state") return "State";
  if (normalized === "country") return "Country";
  return "Place";
}

export function descendantIds(places: PlaceNode[], rootId: string) {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const place of places) {
      if (place.parentId && ids.has(place.parentId) && !ids.has(place.id)) {
        ids.add(place.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function ancestorChain(places: PlaceNode[], placeId: string) {
  const byId = new Map(places.map((place) => [place.id, place]));
  const chain: PlaceNode[] = [];
  let current = byId.get(placeId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

export function placeBreadcrumb(places: PlaceNode[], placeId: string) {
  return ancestorChain(places, placeId)
    .map((place) => place.name)
    .join(" · ");
}

export function filterPlacesWithin(places: PlaceNode[], withinId?: string | null) {
  if (!withinId) return places;
  const ids = descendantIds(places, withinId);
  return places.filter((place) => ids.has(place.id));
}

export function placeFilterHeading(placeName: string) {
  return `Inside ${placeName}`;
}

export type NestedPlace = PlaceNode & { children: NestedPlace[] };

export function nestPlaces(places: PlaceNode[]): NestedPlace[] {
  const byParent = new Map<string | null, PlaceNode[]>();
  for (const place of places) {
    const key = place.parentId || null;
    const list = byParent.get(key) || [];
    list.push(place);
    byParent.set(key, list);
  }
  const walk = (parentId: string | null): NestedPlace[] =>
    (byParent.get(parentId) || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((place) => ({ ...place, children: walk(place.id) }));
  return walk(null);
}

export function placesMissingParent(places: PlaceNode[]) {
  return places.filter((place) => {
    const kind = normalizePlaceKind(place.kind);
    return (kind === "city" || kind === "county" || kind === "state") && !place.parentId;
  });
}

export function placeGapHeading(count: number) {
  if (!count) return "Every town has a county";
  if (count === 1) return "1 place is missing its county or state";
  return `${count} places are missing a county or state`;
}
