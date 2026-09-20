import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  givenName: z.string().max(80).optional(),
  familyName: z.string().max(80).optional(),
  birthDate: z.string().optional().nullable(),
  deathDate: z.string().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid person." }, { status: 400 });
  const existing = await prisma.person.findFirst({ where: { id, familyId: ctx.family.id } });
  if (!existing) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const person = await prisma.person.update({
    where: { id },
    data: {
      displayName: body.data.displayName ?? existing.displayName,
      givenName: body.data.givenName === undefined ? existing.givenName : body.data.givenName || null,
      familyName: body.data.familyName === undefined ? existing.familyName : body.data.familyName || null,
      birthDate:
        body.data.birthDate === undefined
          ? existing.birthDate
          : body.data.birthDate
            ? new Date(body.data.birthDate)
            : null,
      deathDate:
        body.data.deathDate === undefined
          ? existing.deathDate
          : body.data.deathDate
            ? new Date(body.data.deathDate)
            : null,
      notes: body.data.notes === undefined ? existing.notes : body.data.notes,
    },
  });
  return NextResponse.json({ person });
}
