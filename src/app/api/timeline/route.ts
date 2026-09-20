import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { familyHistory } from "@/lib/timeline";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const personId = url.searchParams.get("personId");
  const generationParam = url.searchParams.get("generation");
  const generation = generationParam == null || generationParam === "" ? null : Number(generationParam);
  const history = await familyHistory(ctx.family.id, ctx.role, {
    personId,
    generation: generation != null && !Number.isNaN(generation) ? generation : null,
  });
  return NextResponse.json(history);
}
