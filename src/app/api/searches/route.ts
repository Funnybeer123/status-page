import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { savedSearchHref, savedSearchTitle } from "@/lib/savedSearch";

const schema = z.object({
  title: z.string().max(160).optional(),
  query: z.string().min(1).max(200),
  href: z.string().max(400).optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const searches = await prisma.savedSearch.findMany({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ searches });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A saved search needs a query." }, { status: 400 });
  const search = await prisma.savedSearch.create({
    data: {
      familyId: ctx.family.id,
      userId: ctx.session.user.id,
      title: savedSearchTitle(body.data.title || "", body.data.query),
      query: body.data.query.trim(),
      href: savedSearchHref(body.data.query, body.data.href),
    },
  });
  return NextResponse.json({ search });
}
