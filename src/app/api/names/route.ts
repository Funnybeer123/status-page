import { NextResponse } from "next/server";
import { NameKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  personId: z.string(),
  kind: z.nativeEnum(NameKind),
  name: z.string().min(1).max(160),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const personId = new URL(req.url).searchParams.get("personId");
  const names = await prisma.personName.findMany({
    where: { familyId: ctx.family.id, ...(personId ? { personId } : {}) },
    include: { person: true, citations: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ names });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A name and kind are required." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const name = await prisma.personName.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      kind: body.data.kind,
      name: body.data.name.trim(),
      startedAt: parseDate(body.data.startedAt),
      endedAt: parseDate(body.data.endedAt),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  return NextResponse.json({ name });
}
