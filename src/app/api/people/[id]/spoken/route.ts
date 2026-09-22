import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { spokenNameLine } from "@/lib/soundboard";

const schema = z.object({
  assetId: z.string(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A spoken name needs a recording." }, { status: 400 });
  const person = await prisma.person.findFirst({ where: { id, familyId: ctx.family.id, deletedAt: null } });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const asset = await prisma.asset.findFirst({
    where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!asset) return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  const updated = await prisma.person.update({
    where: { id },
    data: { pronunciationAssetId: asset.id },
  });
  return NextResponse.json({
    person: updated,
    line: spokenNameLine(updated.displayName, updated.pronunciation),
  });
}
