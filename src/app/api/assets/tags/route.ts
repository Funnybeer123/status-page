import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  assetId: z.string(),
  personId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a photograph and a person." }, { status: 400 });
  const [asset, person] = await Promise.all([
    prisma.asset.findFirst({ where: { id: body.data.assetId, familyId: ctx.family.id } }),
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id } }),
  ]);
  if (!asset || !person) return NextResponse.json({ error: "That photograph or person is not in this family." }, { status: 404 });
  const tag = await prisma.personTag.upsert({
    where: { assetId_personId: { assetId: asset.id, personId: person.id } },
    create: { assetId: asset.id, personId: person.id },
    update: {},
    include: { person: true, asset: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "tagged",
    entityType: "asset",
    entityId: asset.id,
    title: asset.title || "Photograph",
    summary: person.displayName,
  });
  return NextResponse.json({ tag });
}
