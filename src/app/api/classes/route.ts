import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { classHeading } from "@/lib/cityDirectory";

const schema = z.object({
  school: z.string().min(1).max(160),
  year: z.union([z.string(), z.number()]),
  place: z.string().max(160).optional(),
  notes: z.string().max(800).optional(),
  personIds: z.array(z.string()).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const classes = await prisma.schoolClass.findMany({
    where: { familyId: ctx.family.id },
    include: { pupils: { include: { person: true } } },
    orderBy: [{ year: "desc" }, { school: "asc" }],
  });
  return NextResponse.json({ classes });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A class list needs a school and a year." }, { status: 400 });
  const year = typeof body.data.year === "number" ? body.data.year : Number.parseInt(body.data.year, 10);
  if (!Number.isFinite(year)) return NextResponse.json({ error: "A class list needs a year." }, { status: 400 });
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: [...new Set(body.data.personIds ?? [])] }, deletedAt: null },
  });
  const row = await prisma.schoolClass.create({
    data: {
      familyId: ctx.family.id,
      school: body.data.school.trim(),
      year,
      place: body.data.place?.trim() || null,
      notes: body.data.notes?.trim() || null,
      pupils: people.length ? { create: people.map((person) => ({ personId: person.id })) } : undefined,
    },
    include: { pupils: { include: { person: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "class",
    entityId: row.id,
    title: classHeading(row.school, row.year),
  });
  return NextResponse.json({ class: row });
}
