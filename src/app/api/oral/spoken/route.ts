import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { spokenByLine } from "@/lib/spokenBy";

const schema = z.object({
  assetId: z.string(),
  personId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Name who is speaking." }, { status: 400 });
  const asset = await prisma.asset.findFirst({
    where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!asset) return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const saved = await prisma.asset.update({
    where: { id: asset.id },
    data: { spokenById: person.id },
    include: { spokenBy: true, uploadedBy: { select: { name: true } } },
  });
  return NextResponse.json({
    asset: saved,
    line: spokenByLine(saved.spokenBy?.displayName, saved.uploadedBy.name),
  });
}
