import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { howRelated } from "@/lib/related";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const fromId = url.searchParams.get("from") || "";
  const toId = url.searchParams.get("to") || "";
  if (!fromId || !toId) {
    return NextResponse.json({ error: "Choose two people." }, { status: 400 });
  }
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id },
      select: { id: true, displayName: true },
    }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const known = new Set(people.map((person) => person.id));
  if (!known.has(fromId) || !known.has(toId)) {
    return NextResponse.json({ error: "Both people must belong to this family." }, { status: 400 });
  }
  return NextResponse.json({ related: howRelated(people, relationships, fromId, toId) });
}
