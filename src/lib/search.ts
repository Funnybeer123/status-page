import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { shouldHideLivingFacts } from "@/lib/privacy";

export type SearchHit = {
  kind: "person" | "name" | "place" | "story" | "document" | "asset" | "event";
  id: string;
  title: string;
  excerpt: string;
  href: string;
};

export type SearchResults = {
  query: string;
  hits: SearchHit[];
};

function contains(query: string) {
  return { contains: query, mode: "insensitive" as const };
}

function excerpt(text: string | null | undefined, query: string) {
  const value = (text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  const idx = value.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return value.slice(0, 180);
  const start = Math.max(0, idx - 40);
  const slice = value.slice(start, start + 180);
  return `${start > 0 ? "…" : ""}${slice}${start + 180 < value.length ? "…" : ""}`;
}

export async function searchArchive(familyId: string, rawQuery: string, role: Role): Promise<SearchResults> {
  const query = rawQuery.trim();
  if (query.length < 2) return { query, hits: [] };

  const like = contains(query);
  const [people, names, places, stories, documents, assets, events] = await Promise.all([
    prisma.person.findMany({
      where: {
        familyId,
        OR: [{ displayName: like }, { givenName: like }, { familyName: like }, { notes: like }],
      },
    }),
    prisma.personName.findMany({
      where: { familyId, name: like },
      include: { person: true },
    }),
    prisma.place.findMany({
      where: {
        familyId,
        OR: [{ name: like }, { locality: like }, { region: like }, { country: like }],
      },
    }),
    prisma.story.findMany({
      where: { familyId, OR: [{ title: like }, { body: like }] },
    }),
    prisma.document.findMany({
      where: { familyId, OR: [{ title: like }, { transcript: like }] },
    }),
    prisma.asset.findMany({
      where: { familyId, title: like },
    }),
    prisma.lifeEvent.findMany({
      where: { familyId, OR: [{ title: like }, { summary: like }] },
      include: { person: true },
    }),
  ]);

  const hits: SearchHit[] = [];

  for (const person of people) {
    const hide = shouldHideLivingFacts(role, person);
    const notesHit = person.notes && person.notes.toLowerCase().includes(query.toLowerCase());
    if (hide && notesHit && !person.displayName.toLowerCase().includes(query.toLowerCase()) && !(person.givenName || "").toLowerCase().includes(query.toLowerCase()) && !(person.familyName || "").toLowerCase().includes(query.toLowerCase())) {
      continue;
    }
    hits.push({
      kind: "person",
      id: person.id,
      title: person.displayName,
      excerpt: hide ? "A living relative in this family." : excerpt(person.notes || person.displayName, query),
      href: `/people/${person.id}`,
    });
  }

  for (const name of names) {
    hits.push({
      kind: "name",
      id: name.id,
      title: `${name.name} (${name.kind})`,
      excerpt: `Also used by ${name.person.displayName}`,
      href: `/people/${name.personId}`,
    });
  }

  for (const place of places) {
    hits.push({
      kind: "place",
      id: place.id,
      title: place.name,
      excerpt: [place.locality, place.region, place.country].filter(Boolean).join(", "),
      href: `/search?q=${encodeURIComponent(place.name)}`,
    });
  }

  for (const story of stories) {
    hits.push({
      kind: "story",
      id: story.id,
      title: story.title,
      excerpt: excerpt(story.body, query),
      href: `/stories/${story.id}`,
    });
  }

  for (const document of documents) {
    hits.push({
      kind: "document",
      id: document.id,
      title: document.title,
      excerpt: excerpt(document.transcript, query),
      href: document.kind === "story" ? `/stories` : `/letters/${document.id}`,
    });
  }

  for (const asset of assets) {
    hits.push({
      kind: "asset",
      id: asset.id,
      title: asset.title || "Untitled item",
      excerpt: asset.kind,
      href: "/archive",
    });
  }

  for (const event of events) {
    if (shouldHideLivingFacts(role, event.person) && (event.kind === "birth" || event.kind === "residence")) {
      continue;
    }
    hits.push({
      kind: "event",
      id: event.id,
      title: event.title,
      excerpt: excerpt(event.summary || event.person.displayName, query),
      href: `/timeline#event-${event.id}`,
    });
  }

  const seen = new Set<string>();
  const unique = hits.filter((hit) => {
    const key = `${hit.kind}:${hit.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { query, hits: unique.slice(0, 40) };
}
