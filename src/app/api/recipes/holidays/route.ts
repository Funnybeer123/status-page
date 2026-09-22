import { NextResponse } from "next/server";
import { DocKind } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileHolidayCookbook, holidayCookbookHeading, recipeHolidayLine } from "@/lib/recipeHoliday";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const recipes = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.recipe, holidayId: { not: null } },
    include: { holiday: true },
    orderBy: { title: "asc" },
  });
  const groups = compileHolidayCookbook(recipes);
  return NextResponse.json({
    heading: holidayCookbookHeading(recipes.length),
    groups: groups.map((group) => ({
      id: group.id,
      holiday: group.holiday,
      recipes: group.recipes.map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        line: recipeHolidayLine(recipe.title, recipe.holiday?.title),
      })),
    })),
  });
}
