import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { parseDate, splitIds } from "@/lib/parse";
import { createStoryRecord } from "@/lib/stories";

const schema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  recordedAt: z.string().optional(),
  tellerPersonId: z.string().optional(),
  personIds: z.union([z.array(z.string()), z.string()]).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const stories = await prisma.story.findMany({
    where: { familyId: ctx.family.id },
    include: {
      teller: true,
      people: { include: { person: true } },
      document: true,
      citations: true,
    },
    orderBy: { recordedAt: "desc" },
  });
  return NextResponse.json({ stories });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A story needs a title and the words themselves." }, { status: 400 });
  const personIds = Array.isArray(body.data.personIds)
    ? body.data.personIds
    : splitIds(body.data.personIds);
  if (body.data.tellerPersonId && !personIds.includes(body.data.tellerPersonId)) {
    personIds.push(body.data.tellerPersonId);
  }
  const known = await prisma.person.findMany({
    where: { familyId: ctx.family.id, id: { in: personIds } },
  });
  if (known.length !== personIds.length) {
    return NextResponse.json({ error: "Every person on a story must belong to this family." }, { status: 400 });
  }
  if (body.data.tellerPersonId && !known.some((person) => person.id === body.data.tellerPersonId)) {
    return NextResponse.json({ error: "The teller must belong to this family." }, { status: 400 });
  }
  const story = await createStoryRecord({
    familyId: ctx.family.id,
    title: body.data.title.trim(),
    body: body.data.body.trim(),
    recordedAt: parseDate(body.data.recordedAt),
    tellerPersonId: body.data.tellerPersonId || null,
    personIds,
  });
  return NextResponse.json({ story });
}
