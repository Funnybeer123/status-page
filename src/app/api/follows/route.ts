import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { followHeading, followLine, muteHeading, muteLine } from "@/lib/follows";
import { alive } from "@/lib/alive";

const schema = z.object({
  personId: z.string(),
  following: z.boolean().optional(),
  muted: z.boolean().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const follows = await prisma.personFollow.findMany({
    where: { userId: ctx.session.user.id, person: { familyId: ctx.family.id, ...alive } },
    include: { person: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    follows,
    heading: followHeading(follows.length),
    lines: follows.map((item) => muteLine(item.person.displayName, Boolean(item.mutedAt))),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a person to follow." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, ...alive },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const on = body.data.following !== false;
  if (on) {
    const mutedAt =
      body.data.muted === undefined ? undefined : body.data.muted ? new Date() : null;
    const follow = await prisma.personFollow.upsert({
      where: { userId_personId: { userId: ctx.session.user.id, personId: person.id } },
      create: {
        userId: ctx.session.user.id,
        personId: person.id,
        mutedAt: mutedAt ?? null,
      },
      update: mutedAt === undefined ? {} : { mutedAt },
      include: { person: true },
    });
    return NextResponse.json({
      follow,
      following: true,
      muted: Boolean(follow.mutedAt),
      heading: followLine(person.displayName),
      muteHeading: muteHeading(Boolean(follow.mutedAt)),
    });
  }
  await prisma.personFollow.deleteMany({
    where: { userId: ctx.session.user.id, personId: person.id },
  });
  return NextResponse.json({ following: false, heading: followLine(person.displayName) });
}
