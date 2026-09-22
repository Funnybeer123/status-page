import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideEventFromViewer, hideMinorDetails, hidePhotoFromAudience } from "@/lib/privacy";
import { compileSameDay, emptySameDayHeading, sameDayHeading } from "@/lib/sameDay";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      tags: { include: { asset: { include: { tags: { include: { person: true } } } } } },
      documents: { include: { document: true } },
      events: true,
      storiesTold: true,
    },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const hideChild = hideMinorDetails(ctx.role, person);
  const items = hideChild
    ? []
    : compileSameDay([
        ...person.events
          .filter((event) => !hideEventFromViewer(ctx.role, { ...event, person }))
          .map((event) => ({
            id: event.id,
            title: event.title,
            happenedOn: event.happenedOn,
            href: `/people/${person.id}`,
          })),
        ...person.documents
          .filter((item) => !item.document.deletedAt)
          .map((item) => ({
            id: item.document.id,
            title: item.document.title,
            happenedOn: item.document.writtenAt,
            href: `/letters/${item.document.id}`,
          })),
        ...person.tags
          .filter((tag) => !tag.asset.deletedAt && !hidePhotoFromAudience(ctx.role, tag.asset.tags.map((row) => row.person)))
          .map((tag) => ({
            id: tag.asset.id,
            title: tag.asset.title || "Photograph",
            happenedOn: tag.asset.capturedAt,
            href: `/archive/${tag.asset.id}`,
          })),
        ...person.storiesTold.map((story) => ({
          id: story.id,
          title: story.title,
          happenedOn: story.recordedAt,
          href: `/stories/${story.id}`,
        })),
      ]);
  return NextResponse.json({
    heading: items.length ? sameDayHeading(person.displayName) : emptySameDayHeading(person.displayName),
    items,
  });
}
