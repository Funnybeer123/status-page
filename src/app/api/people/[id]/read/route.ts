import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileLifeChapters } from "@/lib/chapters";
import { compileLifeReading } from "@/lib/lifeReading";
import { hideMinorDetails, shouldHideLivingFacts } from "@/lib/privacy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      lifeChapters: true,
      documents: { include: { document: true } },
      storiesTold: true,
      storyLinks: { include: { story: true } },
      tags: { include: { asset: true } },
      events: true,
    },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const hidden = hideMinorDetails(ctx.role, person) || shouldHideLivingFacts(ctx.role, person);
  const items = hidden
    ? []
    : [
        ...person.storiesTold.map((story) => ({
          id: story.id,
          kind: "story" as const,
          title: story.title,
          happenedOn: story.recordedAt,
          href: `/stories/${story.id}`,
          body: story.body,
        })),
        ...person.storyLinks.map((link) => ({
          id: link.story.id,
          kind: "story" as const,
          title: link.story.title,
          happenedOn: link.story.recordedAt,
          href: `/stories/${link.story.id}`,
          body: link.story.body,
        })),
        ...person.documents
          .filter((item) => item.document.kind !== "story" && !item.document.deletedAt)
          .map((item) => ({
            id: item.document.id,
            kind: "letter" as const,
            title: item.document.title,
            happenedOn: item.document.writtenAt,
            href: `/letters/${item.document.id}`,
            body: item.document.transcript,
          })),
        ...person.tags
          .filter((tag) => !tag.asset.deletedAt)
          .map((tag) => ({
            id: tag.asset.id,
            kind: "photo" as const,
            title: tag.asset.title || "Photograph",
            happenedOn: tag.asset.capturedAt,
            href: `/archive/${tag.asset.id}`,
          })),
        ...person.events.map((event) => ({
          id: event.id,
          kind: "event" as const,
          title: event.title,
          happenedOn: event.happenedOn,
          href: `/people/${person.id}#event-${event.id}`,
          body: event.summary,
        })),
      ];
  const chapters = compileLifeChapters({
    birthDate: hidden ? null : person.birthDate,
    deathDate: person.deathDate,
    named: hidden ? [] : person.lifeChapters,
    items,
  });
  return NextResponse.json({ reading: compileLifeReading(person.displayName, chapters) });
}
