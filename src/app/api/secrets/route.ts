import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isSecretLocked, secretUntilLine, secretsHeading } from "@/lib/secretUntil";

const schema = z.object({
  documentId: z.string().optional(),
  journalId: z.string().optional(),
  secretUntil: z.string().nullable().optional(),
});

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const [letters, journals] = await Promise.all([
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, secretUntil: { not: null } },
    }),
    prisma.journalEntry.findMany({
      where: { familyId: ctx.family.id, authorId: ctx.session.user.id, secretUntil: { not: null } },
    }),
  ]);
  const items = [
    ...letters.map((letter) => ({
      id: letter.id,
      title: letter.title,
      kind: "letter",
      locked: isSecretLocked(letter.secretUntil),
      line: secretUntilLine(letter.secretUntil),
      href: `/letters/${letter.id}`,
    })),
    ...journals.map((entry) => ({
      id: entry.id,
      title: entry.title,
      kind: "journal",
      locked: isSecretLocked(entry.secretUntil),
      line: secretUntilLine(entry.secretUntil),
      href: "/journal",
    })),
  ];
  return NextResponse.json({ heading: secretsHeading(items.length), items });
}

export async function POST(req: Request) {
  const ctx = await apiFamily(Role.contributor);
  if ("error" in ctx) return ctx.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a date to keep this secret until." }, { status: 400 });
  const secretUntil = body.data.secretUntil ? new Date(body.data.secretUntil) : null;
  if (body.data.documentId) {
    const existing = await prisma.document.findFirst({
      where: { id: body.data.documentId, familyId: ctx.family.id, deletedAt: null },
    });
    if (!existing) return NextResponse.json({ error: "Letter not found." }, { status: 404 });
    const document = await prisma.document.update({
      where: { id: existing.id },
      data: { secretUntil },
    });
    return NextResponse.json({ document, line: secretUntilLine(document.secretUntil) });
  }
  if (body.data.journalId) {
    const existing = await prisma.journalEntry.findFirst({
      where: { id: body.data.journalId, familyId: ctx.family.id, authorId: ctx.session.user.id },
    });
    if (!existing) return NextResponse.json({ error: "Journal entry not found." }, { status: 404 });
    const entry = await prisma.journalEntry.update({
      where: { id: existing.id },
      data: { secretUntil },
    });
    return NextResponse.json({ entry, line: secretUntilLine(entry.secretUntil) });
  }
  return NextResponse.json({ error: "Choose a letter or a journal entry." }, { status: 400 });
}
