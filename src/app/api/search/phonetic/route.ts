import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { phoneticHeading, phoneticPeople, soundex } from "@/lib/phonetic";
import { shouldHideLivingFacts } from "@/lib/privacy";

export async function GET(req: Request) {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const query = new URL(req.url).searchParams.get("q") || "";
  if (query.trim().length < 2) return NextResponse.json({ query, people: [], heading: "Type a name" });
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    include: { names: true },
    orderBy: { displayName: "asc" },
  });
  const matches = phoneticPeople(query, people).map((person) => ({
    id: person.id,
    displayName: shouldHideLivingFacts(ctx.role, person) ? person.displayName : person.displayName,
    givenName: person.givenName,
    familyName: person.familyName,
    soundex: soundex(person.familyName || person.displayName),
  }));
  return NextResponse.json({ query, people: matches, heading: phoneticHeading(query, matches.length) });
}
