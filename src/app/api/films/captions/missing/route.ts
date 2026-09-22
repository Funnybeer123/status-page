import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingCaptionsHeading } from "@/lib/filmCaptions";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const films = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "video" },
    include: { filmCaptions: true },
    orderBy: { title: "asc" },
  });
  const missing = films.filter((film) => !film.filmCaptions.length);
  return NextResponse.json({
    heading: missingCaptionsHeading(missing.length),
    films: missing.map((film) => ({ id: film.id, title: film.title || "Untitled film" })),
  });
}
