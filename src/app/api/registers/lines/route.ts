import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { normalizeRegisterKind } from "@/lib/registerExtract";

const schema = z.object({
  registerId: z.string(),
  kind: z.string().min(1).max(40),
  happenedOn: z.string().optional(),
  text: z.string().min(1).max(800),
  personId: z.string().optional(),
  otherPersonId: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A register line needs the extract." }, { status: 400 });
  const register = await prisma.churchRegister.findFirst({
    where: { id: body.data.registerId, familyId: ctx.family.id },
  });
  if (!register) return NextResponse.json({ error: "Register not found." }, { status: 404 });
  const ids = [body.data.personId, body.data.otherPersonId].filter(Boolean) as string[];
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: ids }, deletedAt: null },
  });
  const known = new Set(people.map((person) => person.id));
  const line = await prisma.churchRegisterLine.create({
    data: {
      registerId: register.id,
      kind: normalizeRegisterKind(body.data.kind),
      happenedOn: body.data.happenedOn ? new Date(body.data.happenedOn) : null,
      text: body.data.text.trim(),
      personId: body.data.personId && known.has(body.data.personId) ? body.data.personId : null,
      otherPersonId: body.data.otherPersonId && known.has(body.data.otherPersonId) ? body.data.otherPersonId : null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true, otherPerson: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "register-line",
    entityId: line.id,
    title: `${register.church}: ${line.kind}`,
  });
  return NextResponse.json({ line });
}
