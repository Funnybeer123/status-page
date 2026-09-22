import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { emptyLifeDraftsHeading, isEmptyDraft } from "@/lib/lifeDraft";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const drafts = await prisma.lifeDraft.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true },
    orderBy: { updatedAt: "desc" },
  });
  const empty = drafts.filter((draft) => isEmptyDraft(draft.body));
  return NextResponse.json({ drafts: empty, heading: emptyLifeDraftsHeading(empty.length) });
}
