import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  listId: z.string(),
  personId: z.string().optional(),
  name: z.string().min(1).max(160),
  amount: z.string().max(80).optional(),
  notes: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A tax name is needed." }, { status: 400 });
  const list = await prisma.taxList.findFirst({ where: { id: body.data.listId, familyId: ctx.family.id } });
  if (!list) return NextResponse.json({ error: "Tax list not found." }, { status: 404 });
  const person = body.data.personId
    ? await prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null } })
    : null;
  const name = await prisma.taxListName.create({
    data: {
      listId: list.id,
      personId: person?.id ?? null,
      name: body.data.name.trim(),
      amount: body.data.amount?.trim() || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "tax-name",
    entityId: name.id,
    title: name.name,
  });
  return NextResponse.json({ name });
}
