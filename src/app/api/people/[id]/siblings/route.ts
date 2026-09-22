import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { siblingKind } from "@/lib/rels";
import { birthOrder, birthOrderHeading, birthOrderLine, missingBirthDatesHeading } from "@/lib/birthOrder";
import { formatDate } from "@/lib/dates";
import { hideMinorDetails } from "@/lib/privacy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, ...alive },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const set = people.filter(
    (row) => row.id === person.id || siblingKind(person.id, row.id, relationships),
  );
  const visible = set.filter((row) => !hideMinorDetails(ctx.role, row));
  const ordered = birthOrder(visible);
  const missing = ordered.filter((row) => !row.birthDate);
  return NextResponse.json({
    person,
    siblings: ordered.map((row) => ({
      ...row,
      line: birthOrderLine(row.order, row.displayName, row.birthDate ? formatDate(row.birthDate) : null),
      kind: row.id === person.id ? "self" : siblingKind(person.id, row.id, relationships),
    })),
    heading: birthOrderHeading(person.displayName, ordered.length),
    missingHeading: missingBirthDatesHeading(missing.length),
  });
}
