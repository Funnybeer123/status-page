import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { assessmentsHeading, insuranceHeading, insuranceMemberLine } from "@/lib/insurance";
import { parseDate } from "@/lib/parse";

const assessmentSchema = z.object({
  company: z.string().min(1).max(160),
  loss: z.string().min(1).max(200),
  assessedOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

const memberSchema = z.object({
  assessmentId: z.string(),
  personId: z.string(),
  paid: z.string().min(1).max(80),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = await prisma.insuranceAssessment.findMany({
    where: { familyId: ctx.family.id },
    include: { members: { include: { person: true } } },
  });
  return NextResponse.json({ assessments: rows, heading: assessmentsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const json = await req.json().catch(() => null);
  const member = memberSchema.safeParse(json);
  if (member.success) {
    const [assessment, person] = await Promise.all([
      prisma.insuranceAssessment.findFirst({ where: { id: member.data.assessmentId, familyId: ctx.family.id } }),
      prisma.person.findFirst({ where: { id: member.data.personId, familyId: ctx.family.id, deletedAt: null } }),
    ]);
    if (!assessment || !person) return NextResponse.json({ error: "Assessment or person not found." }, { status: 404 });
    const row = await prisma.insuranceMember.upsert({
      where: { assessmentId_personId: { assessmentId: assessment.id, personId: person.id } },
      create: {
        familyId: ctx.family.id,
        assessmentId: assessment.id,
        personId: person.id,
        paid: member.data.paid.trim(),
        notes: member.data.notes?.trim() || null,
      },
      update: { paid: member.data.paid.trim(), notes: member.data.notes?.trim() || null },
      include: { person: true },
    });
    return NextResponse.json({
      member: row,
      line: insuranceMemberLine(row.person.displayName, row.paid),
      heading: insuranceHeading(assessment.company, assessment.loss, 1),
    });
  }
  const body = assessmentSchema.safeParse(json);
  if (!body.success) return NextResponse.json({ error: "Name the company, the loss, or who paid." }, { status: 400 });
  const assessment = await prisma.insuranceAssessment.create({
    data: {
      familyId: ctx.family.id,
      company: body.data.company.trim(),
      loss: body.data.loss.trim(),
      assessedOn: parseDate(body.data.assessedOn),
      notes: body.data.notes?.trim() || null,
    },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "assessment",
    entityId: assessment.id,
    title: insuranceHeading(assessment.company, assessment.loss, 0),
    summary: assessment.loss,
  });
  return NextResponse.json({ assessment, heading: assessmentsHeading(1) });
}
