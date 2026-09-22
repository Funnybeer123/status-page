import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { countdownLine } from "@/lib/familyHour";

const schema = z.object({
  personId: z.string(),
  scheduledOn: z.string().min(1),
  notes: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Pick who to interview and a day." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const plan = await prisma.interviewPlan.create({
    data: {
      familyId: ctx.family.id,
      personId: person.id,
      scheduledOn: new Date(body.data.scheduledOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true },
  });
  return NextResponse.json({
    plan,
    line: countdownLine(`Interview · ${plan.person.displayName}`, plan.scheduledOn),
  });
}
