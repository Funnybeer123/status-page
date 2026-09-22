import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideEventFromViewer } from "@/lib/privacy";
import { compileScrapbook, isFirstTag, scrapbookHeading } from "@/lib/scrapbook";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const tag = new URL(req.url).searchParams.get("tag");
  const events = await prisma.lifeEvent.findMany({
    where: {
      familyId: ctx.family.id,
      firstTag: tag && isFirstTag(tag) ? tag : { not: null },
    },
    include: { person: true },
    orderBy: { happenedOn: "asc" },
  });
  const visible = events.filter((event) => !hideEventFromViewer(ctx.role, event));
  const items = compileScrapbook(visible);
  return NextResponse.json({ heading: scrapbookHeading(items.length), items });
}
