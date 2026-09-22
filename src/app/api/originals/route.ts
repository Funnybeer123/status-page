import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileOriginals, holderLine, originalsHeading } from "@/lib/originalHolder";

const schema = z.object({
  documentId: z.string(),
  personId: z.string(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, heldById: { not: null } },
    include: { heldBy: true },
  });
  const rows = compileOriginals(
    letters
      .filter((letter) => letter.heldBy)
      .map((letter) => ({
        id: letter.id,
        title: letter.title,
        holder: letter.heldBy!.displayName,
        holderId: letter.heldById,
      })),
  );
  return NextResponse.json({ originals: rows, heading: originalsHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say who holds the original." }, { status: 400 });
  const [letter, person] = await Promise.all([
    prisma.document.findFirst({
      where: { id: body.data.documentId, familyId: ctx.family.id, deletedAt: null },
    }),
    prisma.person.findFirst({
      where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
    }),
  ]);
  if (!letter) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const updated = await prisma.document.update({
    where: { id: letter.id },
    data: { heldById: person.id },
    include: { heldBy: true },
  });
  return NextResponse.json({
    letter: updated,
    line: holderLine(updated.title, updated.heldBy?.displayName),
  });
}
