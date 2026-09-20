import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { familyTimeline } from "@/lib/timeline";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const personId = new URL(req.url).searchParams.get("personId");
  const entries = await familyTimeline(ctx.family.id, ctx.role, personId);
  return NextResponse.json({ entries });
}
