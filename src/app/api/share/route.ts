import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { Role, ShareKind } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { shareLinksHeading } from "@/lib/shareRevoke";

const schema = z.object({
  kind: z.nativeEnum(ShareKind),
  entityId: z.string(),
});

const revokeSchema = z.object({
  id: z.string().optional(),
  token: z.string().optional(),
  revoke: z.boolean().default(true),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const entityId = url.searchParams.get("entityId");
  const active = url.searchParams.get("active") === "1";
  const links = await prisma.shareLink.findMany({
    where: {
      familyId: ctx.family.id,
      ...(kind ? { kind: kind as ShareKind } : {}),
      ...(entityId ? { entityId } : {}),
      ...(active ? { revokedAt: null } : {}),
    },
    include: { _count: { select: { opens: true } } },
    orderBy: { createdAt: "desc" },
  });
  const open = links.filter((link) => !link.revokedAt).length;
  return NextResponse.json({
    links,
    heading: shareLinksHeading(open, links.length - open),
  });
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
    where: { familyId: ctx.family.id, kind: body.data.kind, entityId: body.data.entityId, revokedAt: null },
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

export async function PATCH(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = revokeSchema.safeParse(await req.json().catch(() => null));
  if (!body.success || (!body.data.id && !body.data.token)) {
    return NextResponse.json({ error: "Choose a share link to revoke." }, { status: 400 });
  }
  const link = await prisma.shareLink.findFirst({
    where: {
      familyId: ctx.family.id,
      ...(body.data.id ? { id: body.data.id } : {}),
      ...(body.data.token ? { token: body.data.token } : {}),
    },
  });
  if (!link) return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  const updated = await prisma.shareLink.update({
    where: { id: link.id },
    data: { revokedAt: body.data.revoke ? new Date() : null },
  });
  return NextResponse.json({
    link: updated,
    href: `/s/${updated.token}`,
    revoked: Boolean(updated.revokedAt),
  });
}
