import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity";
import { compilePotluck } from "@/lib/potluck";

const schema = z.object({
  reunionId: z.string(),
  title: z.string().min(1).max(160),
  personId: z.string().optional(),
  recipeId: z.string().optional(),
  notes: z.string().max(400).optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const reunionId = new URL(req.url).searchParams.get("reunionId");
  const dishes = await prisma.reunionDish.findMany({
    where: { familyId: ctx.family.id, ...(reunionId ? { reunionId } : {}) },
    include: { person: true, recipe: true, reunion: true },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({
    dishes: compilePotluck(
      dishes.map((dish) => ({
        id: dish.id,
        title: dish.title,
        notes: dish.notes,
        personName: dish.person?.displayName ?? null,
        recipeTitle: dish.recipe?.title ?? null,
        recipeId: dish.recipeId,
      })),
    ),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A potluck dish needs a name." }, { status: 400 });
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id: body.data.reunionId, familyId: ctx.family.id },
  });
  if (!reunion) return NextResponse.json({ error: "Reunion not found." }, { status: 404 });
  if (body.data.personId) {
    const person = await prisma.person.findFirst({
      where: { id: body.data.personId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  if (body.data.recipeId) {
    const recipe = await prisma.document.findFirst({
      where: { id: body.data.recipeId, familyId: ctx.family.id, kind: "recipe" },
    });
    if (!recipe) return NextResponse.json({ error: "That recipe is not in the cookbook." }, { status: 400 });
  }
  const dish = await prisma.reunionDish.create({
    data: {
      familyId: ctx.family.id,
      reunionId: reunion.id,
      title: body.data.title.trim(),
      notes: body.data.notes?.trim() || null,
      personId: body.data.personId || null,
      recipeId: body.data.recipeId || null,
    },
    include: { person: true, recipe: true },
  });
  await recordActivity({
    familyId: ctx.family.id,
    actorId: ctx.session.user.id,
    verb: "listed",
    entityType: "dish",
    entityId: reunion.id,
    title: dish.title,
    summary: dish.person?.displayName || reunion.title,
  });
  return NextResponse.json({ dish });
}
