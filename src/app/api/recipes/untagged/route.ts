import { NextResponse } from "next/server";
import { DocKind } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { untaggedRecipesHeading } from "@/lib/recipeHoliday";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const recipes = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.recipe, holidayId: null },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({
    heading: untaggedRecipesHeading(recipes.length),
    recipes: recipes.map((recipe) => ({ id: recipe.id, title: recipe.title })),
  });
}
