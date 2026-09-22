import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { cakeCutterLine, cakesHeading, compileCakes } from "@/lib/cakeCutter";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  cutterId: z.string(),
  couple: z.string().min(1).max(160),
  wedding: z.string().min(1).max(160),
  cutOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = compileCakes(
    (await prisma.cakeCutter.findMany({
      where: { familyId: ctx.family.id },
      include: { cutter: true },
    })).map((row) => ({
      id: row.id,
      cutter: row.cutter.displayName,
      couple: row.couple,
      wedding: row.wedding,
      cutOn: row.cutOn,
    })),
  );
  return NextResponse.json({ cakes: rows, heading: cakesHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Who cut the cake, for which couple, at which wedding?" }, { status: 400 });
  const cutter = await prisma.person.findFirst({
    where: { id: body.data.cutterId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!cutter) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const row = await prisma.cakeCutter.create({
    data: {
      familyId: ctx.family.id,
      cutterId: cutter.id,
      couple: body.data.couple.trim(),
      wedding: body.data.wedding.trim(),
      cutOn: parseDate(body.data.cutOn),
      notes: body.data.notes?.trim() || null,
    },
    include: { cutter: true },
  });
  const line = cakeCutterLine(
    row.cutter.displayName,
    row.couple,
    row.wedding,
    row.cutOn?.toISOString().slice(0, 10),
  );
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "cake",
    entityId: row.id,
    title: line,
    summary: line,
  });
  return NextResponse.json({ cake: row, line });
}
