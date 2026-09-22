import { NextResponse } from "next/server";
import { EventKind } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingWeddingPhotosHeading, missingWitnessesHeading, sameCalendarDay } from "@/lib/weddingParty";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [weddings, photos] = await Promise.all([
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id, kind: EventKind.marriage },
      include: { person: true, otherPerson: true, witnesses: true },
      orderBy: { happenedOn: "asc" },
    }),
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
    }),
  ]);
  const missingWitnesses = weddings.filter((event) => !event.witnesses.length);
  const missingPhotos = weddings.filter(
    (event) => !photos.some((photo) => sameCalendarDay(photo.capturedAt, event.happenedOn)),
  );
  return NextResponse.json({
    missingWitnesses,
    missingPhotos,
    witnessesHeading: missingWitnessesHeading(missingWitnesses.length),
    photosHeading: missingWeddingPhotosHeading(missingPhotos.length),
  });
}
