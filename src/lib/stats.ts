import { prisma } from "@/lib/prisma";
import { buildGenerations } from "@/lib/tree";

export async function familyArchiveStats(familyId: string) {
  const [people, relationships, documents, assets, stories, albums, comments, heirlooms, events, traditions, tasks, places] =
    await Promise.all([
      prisma.person.findMany({ where: { familyId } }),
      prisma.relationship.findMany({ where: { familyId } }),
      prisma.document.findMany({ where: { familyId }, select: { kind: true } }),
      prisma.asset.findMany({ where: { familyId }, select: { kind: true } }),
      prisma.story.count({ where: { familyId } }),
      prisma.album.count({ where: { familyId } }),
      prisma.comment.count({ where: { familyId } }),
      prisma.heirloom.count({ where: { familyId } }),
      prisma.lifeEvent.count({ where: { familyId } }),
      prisma.tradition.count({ where: { familyId } }),
      prisma.researchTask.count({ where: { familyId } }),
      prisma.place.count({ where: { familyId } }),
    ]);
  const dated = people
    .filter((person) => person.birthDate)
    .sort((a, b) => a.birthDate!.getTime() - b.birthDate!.getTime());
  const deceased = people.filter((person) => person.deathDate);
  const tree = buildGenerations(
    people.map((person) => ({ ...person, profileUrl: null })),
    relationships,
  );
  const generationCount = new Set(tree.generation.values()).size;
  return {
    people: people.length,
    living: people.length - deceased.length,
    deceased: deceased.length,
    generations: generationCount,
    oldest: dated[0]
      ? { id: dated[0].id, displayName: dated[0].displayName, birthDate: dated[0].birthDate }
      : null,
    youngest: dated.at(-1)
      ? { id: dated.at(-1)!.id, displayName: dated.at(-1)!.displayName, birthDate: dated.at(-1)!.birthDate }
      : null,
    letters: documents.filter((item) => item.kind === "letter" || item.kind === "note").length,
    clippings: documents.filter((item) => item.kind === "clipping").length,
    recipes: documents.filter((item) => item.kind === "recipe").length,
    obituaries: documents.filter((item) => item.kind === "obituary").length,
    wills: documents.filter((item) => item.kind === "will").length,
    traditions,
    tasks,
    places,
    photos: assets.filter((item) => item.kind === "photo").length,
    audio: assets.filter((item) => item.kind === "audio").length,
    stories,
    albums,
    comments,
    heirlooms,
    events,
  };
}
