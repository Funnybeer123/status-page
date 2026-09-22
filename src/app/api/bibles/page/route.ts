import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { biblePageHeading } from "@/lib/biblePage";

const schema = z.object({
  bibleId: z.string(),
  assetId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a Bible record and a page image." }, { status: 400 });
  const [record, asset] = await Promise.all([
    prisma.bibleRecord.findFirst({ where: { id: body.data.bibleId, familyId: ctx.family.id } }),
    prisma.asset.findFirst({ where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!record) return NextResponse.json({ error: "Bible record not found." }, { status: 404 });
  if (!asset) return NextResponse.json({ error: "Bible page image not found." }, { status: 404 });
  const updated = await prisma.bibleRecord.update({
    where: { id: record.id },
    data: { assetId: asset.id },
    include: { page: true, holder: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "attached",
    entityType: "bible",
    entityId: record.id,
    title: biblePageHeading(record.title),
  });
  return NextResponse.json({ bible: updated, heading: biblePageHeading(record.title) });
}
