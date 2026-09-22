import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { funeralDates, funeralHeading, funeralLife } from "@/lib/funeral";
import { portraitAssetId } from "@/lib/portraits";
import { isLiving } from "@/lib/privacy";
import { formatDate } from "@/lib/dates";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
    include: {
      documents: { include: { document: true } },
      tags: { include: { asset: true } },
    },
  });
  if (!person || isLiving(person)) return NextResponse.json({ error: "Funeral program not found." }, { status: 404 });
  const letter = person.documents
    .map((row) => row.document)
    .find((doc) => doc.kind === "letter" && doc.deletedAt == null);
  const portraitId = portraitAssetId(person, person.tags.map((tag) => ({ personId: tag.personId, assetId: tag.assetId })));
  const portrait = portraitId ? person.tags.find((tag) => tag.assetId === portraitId)?.asset : null;
  return NextResponse.json({
    person,
    heading: funeralHeading(person.displayName),
    dates: funeralDates(person.birthDate, person.deathDate),
    life: funeralLife(person.notes, letter?.transcript),
    portrait: portrait
      ? { id: portrait.id, title: portrait.title, storagePath: portrait.storagePath }
      : null,
    writtenAt: letter?.writtenAt ? formatDate(letter.writtenAt) : null,
  });
}
