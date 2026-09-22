import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { bilingualAskHeading } from "@/lib/ask";

const schema = z.object({
  bilingual: z.boolean(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const user = await prisma.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { askPreferTranslation: true },
  });
  const on = Boolean(user?.askPreferTranslation);
  return NextResponse.json({ bilingual: on, heading: bilingualAskHeading(on) });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Say whether Ask should prefer the translation." }, { status: 400 });
  const user = await prisma.user.update({
    where: { id: ctx.session.user.id },
    data: { askPreferTranslation: body.data.bilingual },
    select: { askPreferTranslation: true },
  });
  return NextResponse.json({
    bilingual: user.askPreferTranslation,
    heading: bilingualAskHeading(user.askPreferTranslation),
  });
}
