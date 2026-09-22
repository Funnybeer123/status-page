import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileOrgans, parlorOrganLine, parlorOrgansHeading } from "@/lib/parlorOrgan";

const schema = z.object({
  personId: z.string(),
  title: z.string().min(1).max(160),
  place: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileOrgans(
    (await prisma.parlorOrgan.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      title: row.title,
      place: row.place,
    })),
  );
  return NextResponse.json({ organs: rows, heading: parlorOrgansHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who played the parlor organ?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.parlorOrgan.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      title: body.data.title.trim(),
      place: body.data.place?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = parlorOrganLine(row.person.displayName, row.title, row.place);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "organ",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ organ: row, line });
}
