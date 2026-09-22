import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";

const schema = z.object({
  heirloomId: z.string(),
  borrowerId: z.string(),
  borrowedOn: z.string().min(1),
  dueOn: z.string().optional(),
  returnedOn: z.string().optional(),
  notes: z.string().max(800).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const loans = await prisma.heirloomLoan.findMany({
    where: { familyId: ctx.family.id },
    include: { heirloom: true, borrower: true },
    orderBy: { borrowedOn: "desc" },
  });
  return NextResponse.json({ loans });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say who borrowed what, and when." }, { status: 400 });
  const [heirloom, borrower] = await Promise.all([
    prisma.heirloom.findFirst({ where: { id: body.data.heirloomId, familyId: ctx.family.id } }),
    prisma.person.findFirst({ where: { id: body.data.borrowerId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!heirloom || !borrower) return NextResponse.json({ error: "Heirloom or person not found." }, { status: 404 });
  const loan = await prisma.heirloomLoan.create({
    data: {
      familyId: ctx.family.id,
      heirloomId: heirloom.id,
      borrowerId: borrower.id,
      borrowedOn: new Date(body.data.borrowedOn),
      dueOn: body.data.dueOn ? new Date(body.data.dueOn) : null,
      returnedOn: body.data.returnedOn ? new Date(body.data.returnedOn) : null,
      notes: body.data.notes?.trim() || null,
    },
    include: { heirloom: true, borrower: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "recorded",
    entityType: "loan",
    entityId: loan.id,
    title: heirloom.title,
    summary: borrower.displayName,
  });
  return NextResponse.json({ loan });
}
