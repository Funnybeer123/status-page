import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { followHeading, followLine } from "@/lib/follows";
import { alive } from "@/lib/alive";

const schema = z.object({
  personId: z.string(),
  following: z.boolean().optional(),
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
    lines: follows.map((item) => followLine(item.person.displayName)),
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
    const follow = await prisma.personFollow.upsert({
      where: { userId_personId: { userId: ctx.session.user.id, personId: person.id } },
      create: { userId: ctx.session.user.id, personId: person.id },
      update: {},
      include: { person: true },
    });
    return NextResponse.json({ follow, following: true, heading: followLine(person.displayName) });
  }
  await prisma.personFollow.deleteMany({
    where: { userId: ctx.session.user.id, personId: person.id },
  });
  return NextResponse.json({ following: false, heading: followLine(person.displayName) });
}
