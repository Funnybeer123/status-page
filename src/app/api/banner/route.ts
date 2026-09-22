import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { bannerHeading } from "@/lib/cityDirectory";

const schema = z.object({
  bannerText: z.string().max(200).optional(),
  bannerNote: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  return NextResponse.json({
    bannerText: ctx.family.bannerText,
    bannerNote: ctx.family.bannerNote,
    heading: bannerHeading(ctx.family.name),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Write the words for the family banner." }, { status: 400 });
  const family = await prisma.family.update({
    where: { id: ctx.family.id },
    data: {
      bannerText: body.data.bannerText?.trim() || null,
      bannerNote: body.data.bannerNote?.trim() || null,
    },
  });
  return NextResponse.json({
    bannerText: family.bannerText,
    bannerNote: family.bannerNote,
    heading: bannerHeading(family.name),
  });
}
