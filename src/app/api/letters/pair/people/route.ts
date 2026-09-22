import { NextResponse } from "next/server";
import { DocKind } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { peopleWithTwoLetters, peopleWithTwoLettersHeading } from "@/lib/letterPair";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.letter, deletedAt: null },
    include: { people: { include: { person: true } } },
  });
  const people = peopleWithTwoLetters(
    letters.map((letter) => ({
      ...letter,
      people: letter.people.map((row) => ({ personId: row.personId, displayName: row.person.displayName })),
    })),
  ).map((group) => ({
    personId: group.personId,
    displayName: group.displayName,
    count: group.letters.length,
    href: `/letters/pair?personId=${group.personId}`,
  }));
  return NextResponse.json({ people, heading: peopleWithTwoLettersHeading(people.length) });
}
