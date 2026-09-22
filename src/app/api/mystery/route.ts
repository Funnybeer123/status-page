import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileMysteryQueue, mysteryGuessLine, mysteryHeading } from "@/lib/photoMystery";

const schema = z.object({
  assetId: z.string(),
  personId: z.string().optional(),
  name: z.string().max(160).optional(),
  note: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [photos, guesses] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["photo", "video"] } },
      include: { tags: true },
    }),
    prisma.photoGuess.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, user: { select: { name: true } } },
    }),
  ]);
  const items = compileMysteryQueue(photos, guesses);
  return NextResponse.json({ heading: mysteryHeading(items.length), items });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Guess who is in the photograph." }, { status: 400 });
  const asset = await prisma.asset.findFirst({
    where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!asset) return NextResponse.json({ error: "Photograph not found." }, { status: 404 });
  let personId = body.data.personId || null;
  if (personId) {
    const person = await prisma.person.findFirst({
      where: { id: personId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const name = body.data.name?.trim() || null;
  if (!personId && !name) return NextResponse.json({ error: "Name the face you recognize." }, { status: 400 });
  const guess = await prisma.photoGuess.create({
    data: {
      familyId: ctx.family.id,
      assetId: asset.id,
      userId: ctx.session.user.id,
      personId,
      name,
      note: body.data.note?.trim() || null,
    },
    include: { person: true, user: { select: { name: true } } },
  });
  return NextResponse.json({
    guess,
    line: mysteryGuessLine(guess.person?.displayName || guess.name, guess.user.name),
  });
}
