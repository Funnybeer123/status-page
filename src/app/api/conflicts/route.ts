import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { findDateConflicts } from "@/lib/conflicts";

const schema = z.object({
  personId: z.string(),
  kind: z.enum(["birth", "death"]),
  eventId: z.string().optional(),
  happenedOn: z.string(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [people, events] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id, kind: { in: ["birth", "death"] } },
    }),
  ]);
  return NextResponse.json({ conflicts: findDateConflicts({ people, events }) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose the date the family prefers." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, ...alive },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const date = new Date(body.data.happenedOn);
  await prisma.lifeEvent.updateMany({
    where: { familyId: ctx.family.id, personId: person.id, kind: body.data.kind },
    data: { preferred: false },
  });
  if (body.data.eventId) {
    const event = await prisma.lifeEvent.findFirst({
      where: { id: body.data.eventId, familyId: ctx.family.id, personId: person.id, kind: body.data.kind },
    });
    if (event) {
      await prisma.lifeEvent.update({
        where: { id: event.id },
        data: { preferred: true, happenedOn: date },
      });
    }
  } else {
    const existing = await prisma.lifeEvent.findFirst({
      where: { familyId: ctx.family.id, personId: person.id, kind: body.data.kind, happenedOn: date },
    });
    if (existing) {
      await prisma.lifeEvent.update({ where: { id: existing.id }, data: { preferred: true } });
    } else {
      await prisma.lifeEvent.create({
        data: {
          familyId: ctx.family.id,
          personId: person.id,
          kind: body.data.kind,
          title: body.data.kind === "birth" ? `${person.displayName} born` : `${person.displayName} died`,
          happenedOn: date,
          preferred: true,
        },
      });
    }
  }
  await prisma.person.update({
    where: { id: person.id },
    data: body.data.kind === "birth" ? { birthDate: date } : { deathDate: date },
  });
  return NextResponse.json({ ok: true });
}
