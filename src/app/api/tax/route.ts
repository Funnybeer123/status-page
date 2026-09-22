import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const nameSchema = z.object({
  personId: z.string().optional(),
  name: z.string().min(1).max(160),
  amount: z.string().max(80).optional(),
  notes: z.string().max(400).optional(),
});

const schema = z.object({
  place: z.string().min(1).max(160),
  year: z.union([z.number(), z.string()]),
  notes: z.string().max(800).optional(),
  names: z.array(nameSchema).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const lists = await prisma.taxList.findMany({
    where: { familyId: ctx.family.id },
    include: { names: { include: { person: true } } },
    orderBy: [{ year: "asc" }, { place: "asc" }],
  });
  return NextResponse.json({ lists });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A tax list needs a place and a year." }, { status: 400 });
  const year = typeof body.data.year === "number" ? body.data.year : Number.parseInt(body.data.year, 10);
  if (!Number.isFinite(year)) return NextResponse.json({ error: "A tax list needs a place and a year." }, { status: 400 });
  const personIds = [...new Set((body.data.names ?? []).map((row) => row.personId).filter(Boolean))] as string[];
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: personIds }, deletedAt: null },
  });
  const known = new Set(people.map((person) => person.id));
  const list = await prisma.taxList.create({
    data: {
      familyId: ctx.family.id,
      place: body.data.place.trim(),
      year,
      notes: body.data.notes?.trim() || null,
      names: body.data.names?.length
        ? {
            create: body.data.names.map((row) => ({
              personId: row.personId && known.has(row.personId) ? row.personId : null,
              name: row.name.trim(),
              amount: row.amount?.trim() || null,
              notes: row.notes?.trim() || null,
            })),
          }
        : undefined,
    },
    include: { names: { include: { person: true } } },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "tax-list",
    entityId: list.id,
    title: `${list.place}, ${list.year}`,
  });
  return NextResponse.json({ list });
}
