import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  voyageId: z.string(),
  personId: z.string(),
  age: z.union([z.number(), z.string()]).optional(),
  role: z.string().max(80).optional(),
  notes: z.string().max(400).optional(),
});

function asAge(value?: number | string) {
  if (value == null || value === "") return null;
  const age = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(age) ? age : null;
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A passenger needs a voyage and a person." }, { status: 400 });
  const [voyage, person] = await Promise.all([
    prisma.voyage.findFirst({ where: { id: body.data.voyageId, familyId: ctx.family.id } }),
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!voyage || !person) return NextResponse.json({ error: "Voyage or person not found." }, { status: 404 });
  const passenger = await prisma.voyagePerson.upsert({
    where: { voyageId_personId: { voyageId: voyage.id, personId: person.id } },
    create: {
      voyageId: voyage.id,
      personId: person.id,
      age: asAge(body.data.age),
      role: body.data.role?.trim() || "passenger",
      notes: body.data.notes?.trim() || null,
    },
    update: {
      age: asAge(body.data.age),
      role: body.data.role?.trim() || "passenger",
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true, voyage: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "passenger",
    entityId: voyage.id,
    title: `${person.displayName} on ${voyage.ship}`,
  });
  return NextResponse.json({ passenger });
}
