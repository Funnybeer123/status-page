import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { butterEggLine, butterEggsHeading, compileButterEggs } from "@/lib/butterEgg";

const schema = z.object({
  personId: z.string(),
  store: z.string().min(1).max(160),
  account: z.string().min(1).max(80),
  year: z.coerce.number().int().min(1800).max(2100).optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileButterEggs(
    (await prisma.butterEggAccount.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    })).map((row) => ({
      id: row.id,
      person: row.person.displayName,
      store: row.store,
      account: row.account,
      year: row.year,
    })),
  );
  return NextResponse.json({ accounts: rows, heading: butterEggsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Which store, and whose butter-and-egg book?" }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.butterEggAccount.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      store: body.data.store.trim(),
      account: body.data.account.trim(),
      year: body.data.year || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  const line = butterEggLine(row.person.displayName, row.store, row.account, row.year);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "butter",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ account: row, line });
}
