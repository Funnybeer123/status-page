import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileHorseTeams, horseTeamLine, horseTeamsHeading } from "@/lib/horseTeam";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  lenderId: z.string(),
  borrowerId: z.string(),
  purpose: z.string().min(1).max(160),
  loanedOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileHorseTeams(
    (await prisma.horseTeam.findMany({
      where: { familyId: ctx.family.id },
      include: { lender: true, borrower: true },
    })).map((row) => ({
      id: row.id,
      lender: row.lender.displayName,
      borrower: row.borrower.displayName,
      purpose: row.purpose,
      loanedOn: row.loanedOn,
    })),
  );
  return NextResponse.json({ teams: rows, heading: horseTeamsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who loaned the team, to whom, and for what?" }, { status: 400 });
  const [lender, borrower] = await Promise.all([
    prisma.person.findFirst({ where: { id: body.data.lenderId, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findFirst({ where: { id: body.data.borrowerId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!lender || !borrower) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.horseTeam.create({
    data: {
      familyId: ctx.family.id,
      lenderId: lender.id,
      borrowerId: borrower.id,
      purpose: body.data.purpose.trim(),
      loanedOn: parseDate(body.data.loanedOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { lender: true, borrower: true },
  });
  const line = horseTeamLine(
    row.lender.displayName,
    row.borrower.displayName,
    row.purpose,
    row.loanedOn?.toISOString().slice(0, 10),
  );
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "team",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ team: row, line });
}
