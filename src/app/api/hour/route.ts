import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileFamilyHour } from "@/lib/familyHour";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [reunions, plans] = await Promise.all([
    prisma.reunionGathering.findMany({ where: { familyId: ctx.family.id } }),
    prisma.interviewPlan.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
    }),
  ]);
  const compiled = compileFamilyHour([
    ...reunions.map((reunion) => ({
      id: reunion.id,
      kind: "reunion" as const,
      title: reunion.title,
      happenedOn: reunion.happenedOn,
      href: `/reunions/${reunion.id}`,
    })),
    ...plans.map((plan) => ({
      id: plan.id,
      kind: "interview" as const,
      title: `Interview · ${plan.person.displayName}`,
      happenedOn: plan.scheduledOn,
      href: `/interviews?personId=${plan.personId}`,
    })),
  ]);
  return NextResponse.json(compiled);
}
