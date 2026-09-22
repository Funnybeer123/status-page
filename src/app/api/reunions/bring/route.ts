import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { bringListHeading, compileBringList } from "@/lib/reunionBring";

const schema = z.object({
  reunionId: z.string(),
  personId: z.string(),
  kind: z.enum(["photo", "heirloom", "dish"]),
  title: z.string().min(1).max(200),
  assetId: z.string().optional(),
  heirloomId: z.string().optional(),
  dishId: z.string().optional(),
  notes: z.string().max(800).optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const reunionId = new URL(req.url).searchParams.get("reunionId");
  if (!reunionId) return NextResponse.json({ error: "Choose a reunion." }, { status: 400 });
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id: reunionId, familyId: ctx.family.id },
    include: {
      dishes: { include: { person: true } },
      brings: { include: { person: true, asset: true, heirloom: true, dish: true } },
    },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  const items = compileBringList({
    brings: reunion.brings.map((item) => ({
      id: item.id,
      kind: item.kind as "photo" | "heirloom" | "dish",
      title: item.title,
      personName: item.person.displayName,
      notes: item.notes,
    })),
    dishes: reunion.dishes.map((dish) => ({
      id: dish.id,
      title: dish.title,
      personName: dish.person?.displayName ?? null,
      notes: dish.notes,
    })),
  });
  return NextResponse.json({ reunion, items, heading: bringListHeading(items.length) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say who is bringing what." }, { status: 400 });
  const [reunion, person] = await Promise.all([
    prisma.reunionGathering.findFirst({ where: { id: body.data.reunionId, familyId: ctx.family.id } }),
    prisma.person.findFirst({ where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null } }),
  ]);
  if (!reunion || !person) return NextResponse.json({ error: "Reunion or person not found." }, { status: 404 });
  const created = await prisma.reunionBring.create({
    data: {
      familyId: ctx.family.id,
      reunionId: reunion.id,
      personId: person.id,
      kind: body.data.kind,
      title: body.data.title.trim(),
      assetId: body.data.assetId || null,
      heirloomId: body.data.heirloomId || null,
      dishId: body.data.dishId || null,
      notes: body.data.notes?.trim() || null,
    },
    include: { person: true, asset: true, heirloom: true, dish: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "listed",
    entityType: "reunion",
    entityId: reunion.id,
    title: created.title,
  });
  return NextResponse.json({ item: created, heading: bringListHeading(1), line: `${created.title} · ${person.displayName} is bringing it` });
}
