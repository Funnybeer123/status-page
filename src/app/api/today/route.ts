import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { collectOnThisDay, onThisDayHeading } from "@/lib/onThisDay";
import { loadOnThisDaySources } from "@/lib/familyDates";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const day = new URL(req.url).searchParams.get("date");
  const from = day ? new Date(day) : new Date();
  const sources = await loadOnThisDaySources(ctx.family.id);
  return NextResponse.json({
    heading: onThisDayHeading(from),
    items: collectOnThisDay({ ...sources, role: ctx.role }, from),
  });
}
