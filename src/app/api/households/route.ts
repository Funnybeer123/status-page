import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { householdKey } from "@/lib/censusCompare";

const personSchema = z.object({
  personId: z.string(),
  role: z.string().max(80).optional(),
  age: z.union([z.number(), z.string()]).optional(),
  occupation: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

const schema = z.object({
  year: z.union([z.number(), z.string()]),
  place: z.string().min(1).max(160),
  street: z.string().max(160).optional(),
  groupKey: z.string().max(160).optional(),
  notes: z.string().max(800).optional(),
  people: z.array(personSchema).optional(),
  personIds: z.array(z.string()).optional(),
});

function asAge(value?: number | string) {
  if (value == null || value === "") return null;
  const age = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(age) ? age : null;
}

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const groupKey = url.searchParams.get("groupKey") || undefined;
  const households = await prisma.censusHousehold.findMany({
    where: { familyId: ctx.family.id, ...(groupKey ? { groupKey } : {}) },
    include: { people: { include: { person: true } }, scan: true },
    orderBy: [{ year: "asc" }, { place: "asc" }],
  });
  return NextResponse.json({ households });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A household needs a year and a place." }, { status: 400 });
  const year = typeof body.data.year === "number" ? body.data.year : Number.parseInt(body.data.year, 10);
  if (!Number.isFinite(year)) return NextResponse.json({ error: "A household needs a year and a place." }, { status: 400 });
  const incoming: { personId: string; role?: string; age?: number | string; occupation?: string; notes?: string }[] = [
    ...(body.data.people ?? []),
    ...(body.data.personIds ?? []).map((personId) => ({ personId })),
  ];
  const unique = new Map(incoming.map((row) => [row.personId, row]));
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: [...unique.keys()] }, deletedAt: null },
  });
  const known = new Set(people.map((person) => person.id));
  const household = await prisma.censusHousehold.create({
    data: {
      familyId: ctx.family.id,
      year,
      place: body.data.place.trim(),
      street: body.data.street?.trim() || null,
      groupKey: body.data.groupKey?.trim() || householdKey(body.data.place, body.data.street),
      notes: body.data.notes?.trim() || null,
      people: {
        create: [...unique.values()]
          .filter((row) => known.has(row.personId))
          .map((row) => ({
            personId: row.personId,
            role: row.role?.trim() || null,
            age: asAge(row.age),
            occupation: row.occupation?.trim() || null,
            notes: row.notes?.trim() || null,
          })),
      },
    },
    include: { people: { include: { person: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "census-household",
    entityId: household.id,
    title: `${household.place}, ${household.year}`,
  });
  return NextResponse.json({ household });
}
