import { NextResponse } from "next/server";
import { DocKind, Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { saveFamilyDocument } from "@/lib/documents";

const schema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(12000),
  writtenAt: z.string().optional(),
  openOn: z.string().min(1),
  addresseeName: z.string().min(1).max(160),
  addresseePersonId: z.string().optional(),
  fromPersonId: z.string().optional(),
  personIds: z.array(z.string()).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const capsules = await prisma.timeCapsule.findMany({
    where: { familyId: ctx.family.id },
    include: {
      document: { include: { people: { include: { person: true } } } },
      addressee: true,
      fromPerson: true,
    },
    orderBy: { openOn: "asc" },
  });
  return NextResponse.json({ capsules });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "A time capsule needs a letter, a name, and a date to open it." }, { status: 400 });
  }
  const personIds = [
    ...new Set(
      [
        ...(body.data.personIds ?? []),
        body.data.addresseePersonId,
        body.data.fromPersonId,
      ].filter(Boolean) as string[],
    ),
  ];
  const heading = `Time capsule for ${body.data.addresseeName}, to be opened ${body.data.openOn}.\n\n`;
  const saved = await saveFamilyDocument({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    title: body.data.title.trim(),
    kind: DocKind.capsule,
    transcript: `${heading}${body.data.body.trim()}`,
    writtenAt: body.data.writtenAt || body.data.openOn,
    personIds,
  });
  const capsule = await prisma.timeCapsule.create({
    data: {
      familyId: ctx.family.id,
      documentId: saved.document.id,
      addresseeName: body.data.addresseeName.trim(),
      addresseePersonId: body.data.addresseePersonId || null,
      fromPersonId: body.data.fromPersonId || null,
      openOn: new Date(body.data.openOn),
    },
    include: {
      document: { include: { people: { include: { person: true } } } },
      addressee: true,
      fromPerson: true,
    },
  });
  return NextResponse.json({ capsule });
}
