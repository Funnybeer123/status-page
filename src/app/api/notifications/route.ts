import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const notifications = await prisma.notification.findMany({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return NextResponse.json({
    notifications,
    unread: notifications.filter((item) => !item.readAt).length,
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (body?.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: ctx.session.user.id, familyId: ctx.family.id },
      data: { readAt: new Date() },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId: ctx.session.user.id, familyId: ctx.family.id, readAt: null },
      data: { readAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}
