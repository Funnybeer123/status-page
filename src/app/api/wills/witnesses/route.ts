import { NextResponse } from "next/server";
import { DocKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compileWillWitnesses, willWitnessLine, willWitnessesHeading } from "@/lib/willWitnesses";
import { formatDate } from "@/lib/dates";
import { parseDate } from "@/lib/parse";

const schema = z.object({
  documentId: z.string(),
  personId: z.string(),
  stoodOn: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const rows = await prisma.willWitness.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, document: true },
  });
  const compiled = compileWillWitnesses(
    rows.map((row) => ({
      id: row.id,
      will: row.document.title,
      witness: row.person.displayName,
      stoodOn: row.stoodOn ? row.stoodOn.toISOString().slice(0, 10) : null,
      notes: row.notes,
      href: `/letters/${row.documentId}`,
    })),
  );
  return NextResponse.json({ witnesses: compiled, heading: willWitnessesHeading(compiled.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say who stood for the will." }, { status: 400 });
  const [will, person] = await Promise.all([
    prisma.document.findFirst({
      where: { id: body.data.documentId, familyId: ctx.family.id, deletedAt: null, kind: DocKind.will },
    }),
    prisma.person.findFirst({
      where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
    }),
  ]);
  if (!will) return NextResponse.json({ error: "Will not found." }, { status: 404 });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const stoodOn = parseDate(body.data.stoodOn);
  const witness = await prisma.willWitness.upsert({
    where: { documentId_personId: { documentId: will.id, personId: person.id } },
    create: {
      familyId: ctx.family.id,
      documentId: will.id,
      personId: person.id,
      stoodOn,
      notes: body.data.notes?.trim() || null,
    },
    update: { stoodOn, notes: body.data.notes?.trim() || null },
    include: { person: true, document: true },
  });
  const line = willWitnessLine(witness.person.displayName, witness.stoodOn ? formatDate(witness.stoodOn) : null);
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "added",
    entityType: "will",
    entityId: will.id,
    title: will.title,
    summary: line,
  });
  return NextResponse.json({ witness, line });
}
