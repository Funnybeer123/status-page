import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { watchersHeading } from "@/lib/bookmarks";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const personId = new URL(req.url).searchParams.get("personId") || "";
  const person = await prisma.person.findFirst({
    where: { id: personId, familyId: ctx.family.id, ...alive },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const [bookmarks, follows] = await Promise.all([
    prisma.personBookmark.findMany({
      where: { personId: person.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.personFollow.findMany({
      where: { personId: person.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return NextResponse.json({
    person,
    bookmarks,
    follows,
    heading: watchersHeading(bookmarks.length, follows.length),
  });
}
