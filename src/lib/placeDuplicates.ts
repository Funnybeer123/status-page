export type PlaceRow = {
  id: string;
  name: string;
  locality?: string | null;
  region?: string | null;
};

export type PlaceDuplicate = {
  keepId: string;
  dropId: string;
  keepName: string;
  dropName: string;
  reasons: string[];
};

function compact(value?: string | null) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function suggestPlaceDuplicates(places: PlaceRow[]): PlaceDuplicate[] {
  const pairs: PlaceDuplicate[] = [];
  for (let i = 0; i < places.length; i += 1) {
    for (let j = i + 1; j < places.length; j += 1) {
      const a = places[i];
      const b = places[j];
      const reasons: string[] = [];
      const aName = compact(a.name);
      const bName = compact(b.name);
      if (aName && aName === bName) reasons.push("Same place name");
      else if (aName && bName && (aName.includes(bName) || bName.includes(aName))) reasons.push("One name is inside the other");
      const aLoc = compact(a.locality);
      const bLoc = compact(b.locality);
      if (aLoc && aLoc === bLoc) reasons.push("Same town");
      if (compact(a.region) && compact(a.region) === compact(b.region) && aName && bName && aName.slice(0, 4) === bName.slice(0, 4)) {
        reasons.push("Same region and a similar name");
      }
      if (reasons.length < 1) continue;
      if (!reasons.some((reason) => /name/i.test(reason))) continue;
      const keep = a.name.length >= b.name.length ? a : b;
      const drop = keep.id === a.id ? b : a;
      pairs.push({
        keepId: keep.id,
        dropId: drop.id,
        keepName: keep.name,
        dropName: drop.name,
        reasons,
      });
    }
  }
  return pairs;
}
