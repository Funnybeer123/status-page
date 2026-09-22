import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { filmCaptionLine, filmCaptionsHeading, parseTimecode, sortFilmCaptions } from "@/lib/filmCaptions";

const schema = z.object({
  filmId: z.string(),
  seconds: z.union([z.number(), z.string()]),
  text: z.string().min(1).max(400),
  oralAssetId: z.string().optional(),
});

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const filmId = new URL(req.url).searchParams.get("filmId");
  const captions = await prisma.filmCaption.findMany({
    where: { familyId: ctx.family.id, ...(filmId ? { filmId } : {}) },
    include: { film: true, oralAsset: true },
    orderBy: { seconds: "asc" },
  });
  const items = sortFilmCaptions(
    captions.map((row) => ({
      id: row.id,
      seconds: row.seconds,
      text: row.text,
      line: filmCaptionLine(row.seconds, row.text),
      filmTitle: row.film.title,
      href: `/films/${row.filmId}/captions`,
    })),
  );
  return NextResponse.json({
    heading: filmCaptionsHeading(captions[0]?.film.title),
    items,
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A caption needs a time and the words." }, { status: 400 });
  const seconds = parseTimecode(body.data.seconds);
  if (seconds == null) return NextResponse.json({ error: "That timestamp is not a time." }, { status: 400 });
  const film = await prisma.asset.findFirst({
    where: { id: body.data.filmId, familyId: ctx.family.id, deletedAt: null },
  });
  if (!film) return NextResponse.json({ error: "Film not found." }, { status: 404 });
  let oralAssetId: string | null = null;
  if (body.data.oralAssetId) {
    const oral = await prisma.asset.findFirst({
      where: { id: body.data.oralAssetId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!oral) return NextResponse.json({ error: "Oral note not found." }, { status: 404 });
    oralAssetId = oral.id;
  }
  const caption = await prisma.filmCaption.create({
    data: {
      familyId: ctx.family.id,
      filmId: film.id,
      oralAssetId,
      seconds,
      text: body.data.text.trim(),
    },
    include: { film: true },
  });
  return NextResponse.json({
    caption,
    heading: filmCaptionsHeading(caption.film.title),
    line: filmCaptionLine(caption.seconds, caption.text),
  });
}
