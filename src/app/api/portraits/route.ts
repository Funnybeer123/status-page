import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { recordActivity } from "@/lib/activity";
import { buildPortraitWall, hangPortraitLine, missingPortraitsHeading } from "@/lib/portraits";
import { hideMinorDetails } from "@/lib/privacy";

const schema = z.object({
  personId: z.string(),
  assetId: z.string(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, relationships, tags] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
    prisma.personTag.findMany({
      where: { person: { familyId: ctx.family.id }, asset: { deletedAt: null, kind: "photo" } },
      orderBy: { asset: { createdAt: "asc" } },
    }),
  ]);
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const assetIds = [
    ...new Set(
      visible
        .map((person) => person.profileAssetId)
        .concat(tags.map((tag) => tag.assetId))
        .filter(Boolean) as string[],
    ),
  ];
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds }, familyId: ctx.family.id, deletedAt: null },
  });
  const assetPath = new Map(assets.map((asset) => [asset.id, asset.storagePath]));
  const wall = buildPortraitWall(
    visible.map((person) => ({ ...person, profileUrl: null })),
    relationships,
    tags,
    assetPath,
  );
  return NextResponse.json({
    ...wall,
    missingHeading: missingPortraitsHeading(wall.missing.length),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a person and a photograph." }, { status: 400 });
  const [person, asset] = await Promise.all([
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, ...alive } }),
    prisma.asset.findFirst({ where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!person || !asset) return NextResponse.json({ error: "That person or photograph is not in this family." }, { status: 404 });
  const updated = await prisma.person.update({
    where: { id: person.id },
    data: { profileAssetId: asset.id },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "hung",
    entityType: "portrait",
    entityId: person.id,
    title: hangPortraitLine(person.displayName),
  });
  return NextResponse.json({ person: updated, heading: hangPortraitLine(person.displayName) });
}
