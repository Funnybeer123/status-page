import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileSitters, sitterLine, sittersHeading } from "@/lib/portraitSitter";

const schema = z.object({
  assetId: z.string(),
  personId: z.string(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, sitterId: { not: null } },
    include: { sitter: true },
  });
  const rows = compileSitters(
    photos
      .filter((photo) => photo.sitter)
      .map((photo) => ({
        id: photo.id,
        title: photo.title || "Untitled portrait",
        sitter: photo.sitter!.displayName,
        sitterId: photo.sitterId,
      })),
  );
  return NextResponse.json({ sitters: rows, heading: sittersHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say who sat for the portrait." }, { status: 400 });
  const [photo, person] = await Promise.all([
    prisma.asset.findFirst({
      where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null },
    }),
    prisma.person.findFirst({
      where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
    }),
  ]);
  if (!photo) return NextResponse.json({ error: "Photograph not found." }, { status: 404 });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const updated = await prisma.asset.update({
    where: { id: photo.id },
    data: { sitterId: person.id },
    include: { sitter: true },
  });
  return NextResponse.json({
    asset: updated,
    line: sitterLine(updated.title, updated.sitter?.displayName),
  });
}
