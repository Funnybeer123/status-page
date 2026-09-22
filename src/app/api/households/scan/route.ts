import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { scanHeading } from "@/lib/scans";

const schema = z.object({
  householdId: z.string(),
  assetId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a household and a scan." }, { status: 400 });
  const [household, asset] = await Promise.all([
    prisma.censusHousehold.findFirst({ where: { id: body.data.householdId, familyId: ctx.family.id } }),
    prisma.asset.findFirst({ where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });
  if (!asset) return NextResponse.json({ error: "Scan not found." }, { status: 404 });
  const updated = await prisma.censusHousehold.update({
    where: { id: household.id },
    data: { assetId: asset.id },
    include: { scan: true, people: { include: { person: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "attached",
    entityType: "census-household",
    entityId: household.id,
    title: scanHeading("census", `${household.place}, ${household.year}`),
  });
  return NextResponse.json({ household: updated, heading: scanHeading("census", `${household.place}, ${household.year}`) });
}
