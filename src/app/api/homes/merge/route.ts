import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mergeHomes } from "@/lib/merge";
import { recordActivity } from "@/lib/activity";
import { mergeHomesHeading } from "@/lib/homeDuplicates";

const schema = z.object({
  keepId: z.string(),
  dropId: z.string(),
});

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose the house to keep and the duplicate to fold in." }, { status: 400 });
  const [keep, drop] = await Promise.all([
    prisma.familyHome.findFirst({ where: { id: body.data.keepId, familyId: ctx.family.id } }),
    prisma.familyHome.findFirst({ where: { id: body.data.dropId, familyId: ctx.family.id } }),
  ]);
  try {
    const home = await mergeHomes({
      familyId: ctx.family.id,
      keepId: body.data.keepId,
      dropId: body.data.dropId,
    });
    await recordActivity({
      familyId: ctx.family.id,
      actorId: ctx.session.user.id,
      verb: "merged",
      entityType: "home",
      entityId: home.id,
      title: mergeHomesHeading(keep?.title || home.title, drop?.title || "a duplicate house"),
    });
    return NextResponse.json({ home });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not merge those houses." }, { status: 400 });
  }
}
