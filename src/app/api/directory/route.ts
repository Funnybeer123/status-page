import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { directoryHeading, directoryLine } from "@/lib/cityDirectory";

const schema = z.object({
  name: z.string().min(1).max(160),
  occupation: z.string().max(160).optional(),
  address: z.string().min(1).max(200),
  year: z.union([z.string(), z.number()]),
  personId: z.string().optional(),
  notes: z.string().max(800).optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const year = Number.parseInt(new URL(req.url).searchParams.get("year") || "", 10) || undefined;
  const entries = await prisma.cityDirectory.findMany({
    where: { familyId: ctx.family.id, ...(year ? { year } : {}) },
    include: { person: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A directory line needs a name, address, and year." }, { status: 400 });
  const year = typeof body.data.year === "number" ? body.data.year : Number.parseInt(body.data.year, 10);
  if (!Number.isFinite(year)) return NextResponse.json({ error: "A directory line needs a year." }, { status: 400 });
  if (body.data.personId) {
    const person = await prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null } });
    if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const entry = await prisma.cityDirectory.create({
    data: {
      familyId: ctx.family.id,
      name: body.data.name.trim(),
      occupation: body.data.occupation?.trim() || null,
      address: body.data.address.trim(),
      year,
      personId: body.data.personId || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "directory",
    entityId: entry.id,
    title: directoryHeading(entry.address, entry.year),
    summary: directoryLine(entry),
  });
  return NextResponse.json({ entry });
}
