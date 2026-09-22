import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { mediaRoot } from "@/lib/media";
import { exportGedcom } from "@/lib/gedcom";

export async function exportFamilyArchive(familyId: string, includeMedia = false) {
  const family = await prisma.family.findFirst({ where: { id: familyId } });
  if (!family) return null;
  const [people, relationships, places, names, residences, events, documents, assets, stories, albums, comments, heirlooms, traditions, tasks] =
    await Promise.all([
      prisma.person.findMany({ where: { familyId, deletedAt: null }, orderBy: { displayName: "asc" } }),
      prisma.relationship.findMany({ where: { familyId } }),
      prisma.place.findMany({ where: { familyId } }),
      prisma.personName.findMany({ where: { familyId } }),
      prisma.residence.findMany({ where: { familyId }, include: { place: true } }),
      prisma.lifeEvent.findMany({ where: { familyId }, include: { place: true } }),
      prisma.document.findMany({ where: { familyId, deletedAt: null }, include: { people: true } }),
      prisma.asset.findMany({ where: { familyId, deletedAt: null }, include: { tags: true } }),
      prisma.story.findMany({ where: { familyId }, include: { people: true } }),
      prisma.album.findMany({ where: { familyId }, include: { items: true } }),
      prisma.comment.findMany({ where: { familyId }, include: { author: { select: { name: true } } } }),
      prisma.heirloom.findMany({ where: { familyId } }),
      prisma.tradition.findMany({ where: { familyId } }),
      prisma.researchTask.findMany({ where: { familyId } }),
    ]);

  const files: { title: string | null; mimeType: string; storagePath: string; dataBase64?: string }[] = [];
  if (includeMedia) {
    for (const asset of assets) {
      const row: (typeof files)[number] = {
        title: asset.title,
        mimeType: asset.mimeType,
        storagePath: asset.storagePath,
      };
      try {
        const bytes = await readFile(join(mediaRoot(), asset.storagePath));
        if (bytes.length <= 1_500_000) row.dataBase64 = bytes.toString("base64");
      } catch {
        // media may live only in the compose volume
      }
      files.push(row);
    }
  } else {
    for (const asset of assets) {
      files.push({ title: asset.title, mimeType: asset.mimeType, storagePath: asset.storagePath });
    }
  }

  const gedcom = exportGedcom({
    familyName: family.name,
    people,
    relationships,
  });

  return {
    exportedAt: new Date().toISOString(),
    family: { id: family.id, name: family.name, slug: family.slug },
    people,
    relationships,
    places,
    names,
    residences,
    events,
    documents: documents.map((document) => ({
      id: document.id,
      title: document.title,
      kind: document.kind,
      transcript: document.transcript,
      writtenAt: document.writtenAt,
      personIds: document.people.map((item) => item.personId),
    })),
    stories: stories.map((story) => ({
      id: story.id,
      title: story.title,
      body: story.body,
      recordedAt: story.recordedAt,
      tellerPersonId: story.tellerPersonId,
      personIds: story.people.map((item) => item.personId),
    })),
    assets: assets.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      title: asset.title,
      mimeType: asset.mimeType,
      capturedAt: asset.capturedAt,
      personIds: asset.tags.map((tag) => tag.personId),
    })),
    albums: albums.map((album) => ({
      id: album.id,
      title: album.title,
      summary: album.summary,
      items: album.items,
    })),
    comments: comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      author: comment.author.name,
      assetId: comment.assetId,
      documentId: comment.documentId,
      storyId: comment.storyId,
    })),
    heirlooms,
    traditions,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      body: task.body,
      personId: task.personId,
      doneAt: task.doneAt,
    })),
    files,
    gedcom,
  };
}
