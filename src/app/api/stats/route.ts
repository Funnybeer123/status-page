import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { familyArchiveStats } from "@/lib/stats";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  return NextResponse.json({ stats: await familyArchiveStats(ctx.family.id) });
}
