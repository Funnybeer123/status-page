import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hidePhotoFromAudience } from "@/lib/privacy";
import { favoritePhotoHeading, favoritesHeading } from "@/lib/favoritePhoto";

const schema = z.object({
  personId: z.string(),
  assetId: z.string(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, favoriteAssetId: { not: null } },
    include: {
      favoriteAsset: { include: { tags: { include: { person: true } } } },
    },
    orderBy: { displayName: "asc" },
  });
  const items = people
    .filter((person) => person.favoriteAsset && !hidePhotoFromAudience(ctx.role, person.favoriteAsset.tags.map((tag) => tag.person)))
    .map((person) => ({
      personId: person.id,
      name: person.displayName,
      assetId: person.favoriteAssetId,
      title: person.favoriteAsset?.title,
      heading: favoritePhotoHeading(person.displayName),
    }));
  return NextResponse.json({ items, heading: favoritesHeading(items.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a favorite photograph." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const asset = await prisma.asset.findFirst({
    where: { id: body.data.assetId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!asset) return NextResponse.json({ error: "Photograph not found." }, { status: 404 });
  const updated = await prisma.person.update({
    where: { id: person.id },
    data: { favoriteAssetId: asset.id },
  });
  return NextResponse.json({
    person: { id: updated.id, favoriteAssetId: updated.favoriteAssetId },
    heading: favoritePhotoHeading(person.displayName),
  });
}
