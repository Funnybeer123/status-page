import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileLastSeen, lastSeenHeading, lastSeenLine } from "@/lib/lastSeen";
import { parseDate } from "@/lib/parse";
import { hideMinorDetails } from "@/lib/privacy";

const schema = z.object({
  personId: z.string(),
  lastSeenOn: z.string().min(1),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    select: { id: true, displayName: true, lastSeenOn: true, birthDate: true, deathDate: true },
  });
  const visible = people.filter((person) => !hideMinorDetails(ctx.role, person));
  const rows = compileLastSeen(visible);
  return NextResponse.json({ people: rows, heading: lastSeenHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "When did we last see them?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const lastSeenOn = parseDate(body.data.lastSeenOn);
  if (!lastSeenOn) return NextResponse.json({ error: "When did we last see them?" }, { status: 400 });
  const updated = await prisma.person.update({
    where: { id: person.id },
    data: { lastSeenOn },
  });
  return NextResponse.json({
    person: updated,
    line: lastSeenLine(updated.displayName, updated.lastSeenOn?.toISOString().slice(0, 10)),
  });
}
