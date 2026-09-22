import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { howRelated } from "@/lib/related";
import { relatedCardHeading, relatedCardLine } from "@/lib/relatedCard";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || ctx.membership.personId || "";
  const to = url.searchParams.get("to") || "";
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      select: { id: true, displayName: true },
    }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  if (!from || !to) {
    return NextResponse.json({ error: "Choose two people." }, { status: 400 });
  }
  const result = howRelated(people, relationships, from, to);
  const fromName = people.find((person) => person.id === from)?.displayName;
  const toName = people.find((person) => person.id === to)?.displayName;
  return NextResponse.json({
    result,
    heading: relatedCardHeading(fromName, toName),
    line: relatedCardLine(result),
  });
}
