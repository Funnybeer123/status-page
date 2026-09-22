import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const person = await prisma.person.findFirst({ where: { id, familyId: ctx.family.id, deletedAt: null } });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const changes = await prisma.personChange.findMany({
    where: { familyId: ctx.family.id, personId: id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ changes });
}
