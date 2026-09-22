import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { assignedHeading } from "@/lib/cityDirectory";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const personId = new URL(req.url).searchParams.get("personId") || ctx.membership.personId;
  if (!personId) return NextResponse.json({ tasks: [], items: [], heading: "Choose who the work is for" });
  const person = await prisma.person.findFirst({
    where: { id: personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const [tasks, items] = await Promise.all([
    prisma.researchTask.findMany({
      where: { familyId: ctx.family.id, assigneeId: person.id },
      include: { person: true, assignee: true, asset: true },
      orderBy: [{ doneAt: "asc" }, { createdAt: "desc" }],
    }),
    prisma.digitizeItem.findMany({
      where: { familyId: ctx.family.id, assigneeId: person.id },
      include: { holder: true, assignee: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return NextResponse.json({
    person: { id: person.id, displayName: person.displayName },
    tasks,
    items,
    heading: assignedHeading(person.displayName, tasks.length + items.length),
  });
}
