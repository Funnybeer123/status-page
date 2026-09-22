import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { bookmarkHeading, bookmarkLine } from "@/lib/bookmarks";
import { alive } from "@/lib/alive";

const schema = z.object({
  personId: z.string(),
  bookmarked: z.boolean().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const bookmarks = await prisma.personBookmark.findMany({
    where: { userId: ctx.session.user.id, person: { familyId: ctx.family.id, ...alive } },
    include: { person: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    bookmarks,
    heading: bookmarkHeading(bookmarks.length),
    lines: bookmarks.map((item) => bookmarkLine(item.person.displayName)),
  });
}

export async function POST(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a person to bookmark." }, { status: 400 });
  const person = await prisma.person.findFirst({
    where: { id: body.data.personId, familyId: ctx.family.id, ...alive },
  });
  if (!person) return NextResponse.json({ error: "Person not found." }, { status: 404 });
  const on = body.data.bookmarked !== false;
  if (on) {
    const bookmark = await prisma.personBookmark.upsert({
      where: { userId_personId: { userId: ctx.session.user.id, personId: person.id } },
      create: { userId: ctx.session.user.id, personId: person.id },
      update: {},
      include: { person: true },
    });
    return NextResponse.json({ bookmark, bookmarked: true, heading: bookmarkLine(person.displayName) });
  }
  await prisma.personBookmark.deleteMany({
    where: { userId: ctx.session.user.id, personId: person.id },
  });
  return NextResponse.json({ bookmarked: false, heading: bookmarkLine(person.displayName) });
}
