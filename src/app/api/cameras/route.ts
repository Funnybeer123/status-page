import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileCameras, photographerLine, camerasHeading } from "@/lib/photographer";

const schema = z.object({
  assetId: z.string(),
  personId: z.string(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, takenById: { not: null } },
    include: { takenBy: true },
  });
  const rows = compileCameras(
    photos
      .filter((photo) => photo.takenBy)
      .map((photo) => ({
        id: photo.id,
        title: photo.title || "Untitled photograph",
        photographer: photo.takenBy!.displayName,
        photographerId: photo.takenById,
      })),
  );
  return NextResponse.json({ cameras: rows, heading: camerasHeading(rows.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say who held the camera." }, { status: 400 });
  const [photo, person] = await Promise.all([
    prisma.asset.findFirst({ where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!photo || !person) return NextResponse.json({ error: "Photograph or person not found." }, { status: 404 });
  const updated = await prisma.asset.update({
    where: { id: photo.id },
    data: { takenById: person.id },
    include: { takenBy: true },
  });
  return NextResponse.json({
    asset: updated,
    line: photographerLine(updated.title, updated.takenBy?.displayName),
  });
}
