import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileUncited } from "@/lib/uncited";
import { suggestDuplicates } from "@/lib/duplicates";
import { unlocatedTags } from "@/lib/whoWhere";
import { compileReviewInbox } from "@/lib/reviewInbox";
import { alive } from "@/lib/alive";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const familyId = ctx.family.id;
  const [ocr, people, citations, census, tags] = await Promise.all([
    prisma.document.findMany({
      where: { familyId, deletedAt: null, needsReview: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.person.findMany({
      where: { familyId, ...alive },
      select: { id: true, displayName: true, givenName: true, familyName: true, birthDate: true, deathDate: true },
    }),
    prisma.citation.findMany({
      where: { familyId },
      select: { personId: true, kind: true },
    }),
    prisma.lifeEvent.findMany({
      where: { familyId, kind: "census" },
      select: { personId: true },
    }),
    prisma.personTag.findMany({
      where: { asset: { familyId, deletedAt: null } },
      include: { person: true, asset: true },
    }),
  ]);
  const uncited = compileUncited({
    people,
    citations,
    censusPersonIds: census.map((row) => row.personId),
  });
  const unlocated = unlocatedTags(
    tags.map((tag) => ({
      id: tag.id,
      personId: tag.personId,
      name: tag.person.displayName,
      x: tag.x,
      y: tag.y,
      assetTitle: tag.asset.title,
      assetId: tag.assetId,
    })),
  );
  const duplicates = suggestDuplicates(people);
  const items = compileReviewInbox({ ocr, uncited, unlocated, duplicates });
  return NextResponse.json({ items });
}
