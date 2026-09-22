import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { thankYouEmpty, thankYouHeading, thankYouLine, thankYouNote } from "@/lib/thankYou";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const last = await prisma.activity.findFirst({
    where: { familyId: ctx.family.id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (!last) {
    return NextResponse.json({ heading: thankYouHeading(), note: thankYouEmpty(), activity: null });
  }
  return NextResponse.json({
    heading: thankYouHeading(),
    note: thankYouNote({ actorName: last.actor.name, title: last.title, verb: last.verb }),
    line: thankYouLine({ actorName: last.actor.name, title: last.title }),
    activity: {
      id: last.id,
      title: last.title,
      verb: last.verb,
      actorName: last.actor.name,
    },
  });
}
