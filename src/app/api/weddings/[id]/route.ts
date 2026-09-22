import { NextResponse } from "next/server";
import { EventKind } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { coupleLine, sameCalendarDay, weddingPartyHeading, weddingPhotosHeading, witnessLine } from "@/lib/weddingParty";
import { filterAssetsForAudience } from "@/lib/privacy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const event = await prisma.lifeEvent.findFirst({
    where: { id, familyId: ctx.family.id, kind: EventKind.marriage },
    include: {
      person: true,
      otherPerson: true,
      place: true,
      witnesses: { include: { person: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Wedding not found." }, { status: 404 });
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
    include: { tags: { include: { person: true } } },
  });
  const dayPhotos = filterAssetsForAudience(
    photos.filter((photo) => sameCalendarDay(photo.capturedAt, event.happenedOn)),
    ctx.role,
  );
  return NextResponse.json({
    event,
    couple: coupleLine(event.person.displayName, event.otherPerson?.displayName),
    witnesses: event.witnesses.map((row) => ({
      ...row,
      line: witnessLine(row.person.displayName, row.role),
    })),
    photos: dayPhotos,
    heading: weddingPartyHeading(event.person.displayName, event.otherPerson?.displayName),
    photosHeading: weddingPhotosHeading(dayPhotos.length),
  });
}
