import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { normalizeRegisterKind } from "@/lib/registerExtract";

const lineSchema = z.object({
  kind: z.string().min(1).max(40),
  happenedOn: z.string().optional(),
  text: z.string().min(1).max(800),
  personId: z.string().optional(),
  otherPersonId: z.string().optional(),
  notes: z.string().max(400).optional(),
});

const schema = z.object({
  church: z.string().min(1).max(160),
  place: z.string().max(160).optional(),
  startedOn: z.string().optional(),
  endedOn: z.string().optional(),
  notes: z.string().max(800).optional(),
  lines: z.array(lineSchema).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const registers = await prisma.churchRegister.findMany({
    where: { familyId: ctx.family.id },
    include: { lines: { include: { person: true, otherPerson: true } } },
    orderBy: { church: "asc" },
  });
  return NextResponse.json({ registers });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A register needs the church name." }, { status: 400 });
  const personIds = [...new Set((body.data.lines ?? []).flatMap((line) => [line.personId, line.otherPersonId].filter(Boolean)))] as string[];
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: personIds }, deletedAt: null },
  });
  const known = new Set(people.map((person) => person.id));
  const register = await prisma.churchRegister.create({
    data: {
      familyId: ctx.family.id,
      church: body.data.church.trim(),
      place: body.data.place?.trim() || null,
      startedOn: body.data.startedOn ? new Date(body.data.startedOn) : null,
      endedOn: body.data.endedOn ? new Date(body.data.endedOn) : null,
      notes: body.data.notes?.trim() || null,
      lines: body.data.lines?.length
        ? {
            create: body.data.lines.map((line) => ({
              kind: normalizeRegisterKind(line.kind),
              happenedOn: line.happenedOn ? new Date(line.happenedOn) : null,
              text: line.text.trim(),
              personId: line.personId && known.has(line.personId) ? line.personId : null,
              otherPersonId: line.otherPersonId && known.has(line.otherPersonId) ? line.otherPersonId : null,
              notes: line.notes?.trim() || null,
            })),
          }
        : undefined,
    },
    include: { lines: { include: { person: true, otherPerson: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "church-register",
    entityId: register.id,
    title: register.church,
  });
  return NextResponse.json({ register });
}
