import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { shareOpenLine, shareOpensHeading } from "@/lib/shareRevoke";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const linkId = url.searchParams.get("linkId") || "";
  const token = url.searchParams.get("token") || "";
  const link = await prisma.shareLink.findFirst({
    where: {
      familyId: ctx.family.id,
      ...(linkId ? { id: linkId } : {}),
      ...(token ? { token } : {}),
    },
  });
  if (!link) return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  const opens = await prisma.shareLinkOpen.findMany({
    where: { shareLinkId: link.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { openedAt: "desc" },
  });
  return NextResponse.json({
    link,
    opens,
    heading: shareOpensHeading(opens.length),
    lines: opens.map((open) => shareOpenLine({ name: open.user?.name, userAgent: open.userAgent, openedAt: open.openedAt })),
  });
}
