import { NextResponse } from "next/server";
import { EventKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";

const schema = z.object({
  personId: z.string(),
  kind: z.enum(["birth", "death"]),
  happenedOn: z.string(),
  preferred: z.boolean().optional(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A person, kind, and date are required." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, ...alive },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const happenedOn = new Date(body.data.happenedOn);
  const event = await prisma.lifeEvent.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      kind: body.data.kind === "birth" ? EventKind.birth : EventKind.death,
      title:
        body.data.kind === "birth"
          ? `${person.displayName} born (also recorded)`
          : `${person.displayName} died (also recorded)`,
      happenedOn,
      preferred: Boolean(body.data.preferred),
    },
  });
  if (body.data.preferred) {
    await prisma.lifeEvent.updateMany({
      where: { familyId: ctx.family.id, personId: person.id, kind: event.kind, id: { not: event.id } },
      data: { preferred: false },
    });
    await prisma.person.update({
      where: { id: person.id },
      data: body.data.kind === "birth" ? { birthDate: happenedOn } : { deathDate: happenedOn },
    });
  }
  return NextResponse.json({ event });
}
