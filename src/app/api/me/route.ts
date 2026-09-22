import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";

const schema = z.object({
  personId: z.string().nullable(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const person = ctx.membership.personId
    ? await prisma.person.findFirst({
        where: { id: ctx.membership.personId, familyId: ctx.family.id, ...alive },
      })
    : null;
  return NextResponse.json({ personId: ctx.membership.personId, person });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose the person who is you." }, { status: 400 });
  if (body.data.personId) {
    const person = await prisma.person.findFirst({
      where: { id: body.data.personId, familyId: ctx.family.id, ...alive },
    });
    if (!person) return NextResponse.json({ error: "That person is not in this family." }, { status: 404 });
    const taken = await prisma.membership.findFirst({
      where: { familyId: ctx.family.id, personId: person.id, userId: { not: ctx.session.user.id } },
    });
    if (taken) return NextResponse.json({ error: "Someone else already claimed that person." }, { status: 409 });
  }
  const membership = await prisma.membership.update({
    where: { id: ctx.membership.id },
    data: { personId: body.data.personId },
    include: { person: true },
  });
  return NextResponse.json({ personId: membership.personId, person: membership.person });
}
