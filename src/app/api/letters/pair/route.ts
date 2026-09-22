import { NextResponse } from "next/server";
import { DocKind } from "@prisma/client";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { letterPairHeading, letterPairSideLabel, sortLettersForPair } from "@/lib/letterPair";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const params = new URL(req.url).searchParams;
  const personId = params.get("personId") || "";
  const a = params.get("a") || "";
  const b = params.get("b") || "";
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.letter, deletedAt: null },
    include: { people: { include: { person: true } } },
  });
  const person = personId
    ? await prisma.person.findFirst({ where: { id: personId, familyId: ctx.family.id, deletedAt: null } })
    : null;
  const byPerson = person
    ? letters.filter((letter) => letter.people.some((row) => row.personId === person.id))
    : letters.filter((letter) => (a && letter.id === a) || (b && letter.id === b));
  const sorted = sortLettersForPair(byPerson);
  const left = a ? sorted.find((letter) => letter.id === a) ?? sorted[0] : sorted[0];
  const right = b ? sorted.find((letter) => letter.id === b) ?? sorted[1] : sorted.find((letter) => letter.id !== left?.id);
  if (!left || !right) {
    return NextResponse.json({ error: "This person does not have two letters to compare yet." }, { status: 404 });
  }
  const name = person?.displayName || left.people[0]?.person.displayName || "the same person";
  return NextResponse.json({
    heading: letterPairHeading(name),
    personId: person?.id ?? left.people[0]?.personId,
    left: {
      id: left.id,
      title: left.title,
      transcript: left.transcript,
      label: letterPairSideLabel(left.title, formatDate(left.writtenAt, "")),
    },
    right: {
      id: right.id,
      title: right.title,
      transcript: right.transcript,
      label: letterPairSideLabel(right.title, formatDate(right.writtenAt, "")),
    },
  });
}
