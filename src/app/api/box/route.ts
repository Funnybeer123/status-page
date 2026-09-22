import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { alive } from "@/lib/alive";
import { boxFileLine, boxFileManyLine, boxHeading, boxItemLine } from "@/lib/box";

const schema = z.object({
  assetId: z.string().optional(),
  assetIds: z.array(z.string()).optional(),
  personId: z.string(),
  x: z.number().min(0).max(100).optional().nullable(),
  y: z.number().min(0).max(100).optional().nullable(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const assets = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, tags: { none: {} } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    assets,
    heading: boxHeading(assets.length),
    lines: assets.map((asset) => boxItemLine(asset.title)),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose an upload and a person." }, { status: 400 });
  const assetIds = [...new Set([...(body.data.assetIds ?? []), body.data.assetId].filter(Boolean))] as string[];
  if (!assetIds.length) return NextResponse.json({ error: "Choose an upload and a person." }, { status: 400 });
  const person = await prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, ...alive } });
  if (!person) return NextResponse.json({ error: "That upload or person is not in this family." }, { status: 404 });
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds }, familyId: ctx.family.id, deletedAt: null },
  });
  if (!assets.length || assets.length !== assetIds.length) {
    return NextResponse.json({ error: "That upload or person is not in this family." }, { status: 404 });
  }
  const tags = [];
  for (const asset of assets) {
    const tag = await prisma.personTag.upsert({
      where: { assetId_personId: { assetId: asset.id, personId: person.id } },
      create: { assetId: asset.id, personId: person.id, x: body.data.x ?? null, y: body.data.y ?? null },
      update: {
        x: body.data.x === undefined ? undefined : body.data.x,
        y: body.data.y === undefined ? undefined : body.data.y,
      },
      include: { person: true, asset: true },
    });
    tags.push(tag);
    await recordActivity({
      familyId: ctx.family.id,
      actorId: ctx.session.user.id,
      verb: "filed",
      entityType: "asset",
      entityId: asset.id,
      title: asset.title || "Upload",
      summary: person.displayName,
    });
  }
  if (tags.length === 1) {
    const asset = assets[0]!;
    return NextResponse.json({
      tag: tags[0],
      heading: boxFileLine(asset.title || "", person.displayName),
    });
  }
  return NextResponse.json({
    tags,
    heading: boxFileManyLine(tags.length, person.displayName),
    count: tags.length,
  });
}
