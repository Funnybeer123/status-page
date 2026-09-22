import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isSecretLocked, lockedSecretsHeading, secretUntilLine } from "@/lib/secretUntil";

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
    ...letters
      .filter((letter) => isSecretLocked(letter.secretUntil))
      .map((letter) => ({
        id: letter.id,
        title: letter.title,
        kind: "letter",
        line: secretUntilLine(letter.secretUntil),
      })),
    ...journals
      .filter((entry) => isSecretLocked(entry.secretUntil))
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        kind: "journal",
        line: secretUntilLine(entry.secretUntil),
      })),
  ];
  return NextResponse.json({ heading: lockedSecretsHeading(items.length), items });
}
