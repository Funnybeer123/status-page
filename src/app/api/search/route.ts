import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { searchArchive } from "@/lib/search";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const query = new URL(req.url).searchParams.get("q") || "";
  const results = await searchArchive(ctx.family.id, query, ctx.role);
  return NextResponse.json(results);
}
