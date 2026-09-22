import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compilePartyLines, partyLineLine, partyLinesHeading } from "@/lib/partyLine";

const schema = z.object({
  exchange: z.string().min(1).max(40),
  number: z.string().min(1).max(40),
  personIds: z.array(z.string()).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = await prisma.partyLine.findMany({
    where: { familyId: ctx.family.id },
    include: { people: { include: { person: true } } },
  });
  const compiled = compilePartyLines(
    rows.map((row) => ({
      id: row.id,
      exchange: row.exchange,
      number: row.number,
      people: row.people.map((link) => link.person.displayName),
    })),
  );
  return NextResponse.json({ lines: compiled, heading: partyLinesHeading(compiled.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "An exchange and number are required." }, { status: 400 });
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: [...new Set(body.data.personIds ?? [])] }, deletedAt: null },
  });
  const row = await prisma.partyLine.create({
    data: {
      familyId: ctx.family.id,
      exchange: body.data.exchange.trim(),
      number: body.data.number.trim(),
      notes: body.data.notes?.trim() || null,
      people: people.length ? { create: people.map((person) => ({ personId: person.id })) } : undefined,
    },
    include: { people: { include: { person: true } } },
  });
  const line = partyLineLine(row.exchange, row.number, row.people.map((link) => link.person.displayName));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "party-line",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ line: row, text: line });
}
