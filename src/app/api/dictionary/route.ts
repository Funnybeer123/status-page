import { NextResponse } from "next/server";
import { NameKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { dictionaryHeading, nicknameUseLine } from "@/lib/nicknameDictionary";

const schema = z.object({
  nameId: z.string().optional(),
  personId: z.string().optional(),
  name: z.string().max(160).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const names = await prisma.personName.findMany({
    where: { familyId: ctx.family.id, kind: NameKind.nickname },
    include: { person: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    heading: dictionaryHeading(names.length),
    nicknames: names.map((row) => ({
      ...row,
      line: nicknameUseLine(row.name, row.person.displayName, row.notes),
    })),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say which nickname and how it is used." }, { status: 400 });
  if (body.data.nameId) {
    const existing = await prisma.personName.findFirst({
      where: { id: body.data.nameId, familyId: ctx.family.id, kind: NameKind.nickname },
      include: { person: true },
    });
    if (!existing) return NextResponse.json({ error: "Nickname not found." }, { status: 404 });
    const name = await prisma.personName.update({
      where: { id: existing.id },
      data: { notes: body.data.notes?.trim() || null },
      include: { person: true },
    });
    return NextResponse.json({
      name,
      line: nicknameUseLine(name.name, name.person.displayName, name.notes),
    });
  }
  if (!body.data.personId || !body.data.name?.trim()) {
    return NextResponse.json({ error: "A nickname needs a person and the name itself." }, { status: 400 });
  }
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const name = await prisma.personName.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      kind: NameKind.nickname,
      name: body.data.name.trim(),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  return NextResponse.json({
    name,
    line: nicknameUseLine(name.name, name.person.displayName, name.notes),
  });
}
