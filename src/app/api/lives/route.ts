import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { familyHistory, filterHistory } from "@/lib/timeline";
import { compileTogether, marksFromHistory, twoLivesHeading, twoLivesLine } from "@/lib/twoLives";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const a = url.searchParams.get("a") || url.searchParams.get("from");
  const b = url.searchParams.get("b") || url.searchParams.get("to");
  if (!a || !b) return NextResponse.json({ error: "Choose two people." }, { status: 400 });
  const [left, right] = await Promise.all([
    prisma.person.findFirst({ where: { id: a, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findFirst({ where: { id: b, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!left || !right) return NextResponse.json({ error: "Both people must belong to this family." }, { status: 404 });
  const history = await familyHistory(ctx.family.id, ctx.role);
  const leftEntries = filterHistory(history.entries, { personId: left.id });
  const rightEntries = filterHistory(history.entries, { personId: right.id });
  const items = compileTogether(
    marksFromHistory(leftEntries, left.id, left.displayName),
    marksFromHistory(rightEntries, right.id, right.displayName),
  );
  return NextResponse.json({
    a: { id: left.id, displayName: left.displayName },
    b: { id: right.id, displayName: right.displayName },
    items,
    heading: twoLivesHeading(left.displayName, right.displayName),
    lines: items.map(twoLivesLine),
  });
}
