import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { boardYears, compileBoards, schoolBoardLine, schoolBoardsHeading } from "@/lib/schoolBoard";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  personId: z.string(),
  office: z.string().min(1).max(80),
  startedOn: z.string().optional(),
  endedOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileBoards(
    (await prisma.schoolBoardTerm.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      office: row.office,
      startedOn: row.startedOn,
      endedOn: row.endedOn,
    })),
  );
  return NextResponse.json({ boards: rows, heading: schoolBoardsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who sat on the school board, and in which office?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.schoolBoardTerm.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      office: body.data.office.trim(),
      startedOn: parseDate(body.data.startedOn),
      endedOn: parseDate(body.data.endedOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = schoolBoardLine(row.person.displayName, row.office, boardYears(row.startedOn, row.endedOn));
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "board",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ board: row, line });
}
