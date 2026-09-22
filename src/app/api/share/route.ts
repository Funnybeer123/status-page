import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { Role, ShareKind } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  kind: z.nativeEnum(ShareKind),
  entityId: z.string(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const entityId = url.searchParams.get("entityId");
  const links = await prisma.shareLink.findMany({
    where: {
      familyId: ctx.family.id,
      ...(kind ? { kind: kind as ShareKind } : {}),
      ...(entityId ? { entityId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ links });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose what to share." }, { status: 400 });
  if (body.data.kind === ShareKind.memorial) {
    const person = await prisma.person.findFirst({
      where: { id: body.data.entityId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!person?.deathDate) return NextResponse.json({ error: "Share a memorial for someone who has died." }, { status: 400 });
  } else {
    const album = await prisma.album.findFirst({
      where: { id: body.data.entityId, familyId: ctx.family.id },
    });
    if (!album) return NextResponse.json({ error: "Album not found." }, { status: 404 });
  }
  const existing = await prisma.shareLink.findFirst({
    where: { familyId: ctx.family.id, kind: body.data.kind, entityId: body.data.entityId },
  });
  if (existing) return NextResponse.json({ link: existing, href: `/s/${existing.token}` });
  const link = await prisma.shareLink.create({
    data: {
      familyId: ctx.family.id,
      kind: body.data.kind,
      entityId: body.data.entityId,
      token: randomBytes(16).toString("hex"),
      createdById: ctx.session.user.id,
    },
  });
  return NextResponse.json({ link, href: `/s/${link.token}` });
}
