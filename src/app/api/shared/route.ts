import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { findSharedAncestors } from "@/lib/sharedAncestors";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const fromId = url.searchParams.get("from") || "";
  const toId = url.searchParams.get("to") || "";
  if (!fromId || !toId) return NextResponse.json({ ancestors: [], fromId, toId });
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  if (!people.some((person) => person.id === fromId) || !people.some((person) => person.id === toId)) {
    return NextResponse.json({ error: "Both people must be in this family." }, { status: 404 });
  }
  return NextResponse.json({
    fromId,
    toId,
    ancestors: findSharedAncestors(fromId, toId, people, relationships),
  });
}
