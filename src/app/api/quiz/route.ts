import { NextResponse } from "next/server";
import { apiFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isLiving } from "@/lib/privacy";
import { compileGrandchildQuiz } from "@/lib/grandchildQuiz";

export async function GET() {
  const ctx = await apiFamily();
  if ("error" in ctx) return ctx.error;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    select: { id: true, deathDate: true },
  });
  const living = new Set(people.filter((person) => isLiving(person)).map((person) => person.id));
  const [letters, stories] = await Promise.all([
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
      include: { people: true },
    }),
    prisma.story.findMany({
      where: { familyId: ctx.family.id },
      include: { people: true },
    }),
  ]);
  const sources = [
    ...letters
      .filter((letter) => {
        const linked = letter.people.map((item) => item.personId);
        return !linked.length || linked.some((id) => !living.has(id));
      })
      .map((letter) => ({
        id: letter.id,
        title: letter.title,
        kind: "letter",
        body: letter.transcript,
        href: `/letters/${letter.id}`,
      })),
    ...stories
      .filter((story) => {
        if (story.tellerPersonId && living.has(story.tellerPersonId)) return false;
        const linked = story.people.map((item) => item.personId);
        return !linked.length || linked.some((id) => !living.has(id));
      })
      .map((story) => ({
        id: story.id,
        title: story.title,
        kind: "story",
        body: story.body,
        href: `/stories/${story.id}`,
      })),
  ];
  return NextResponse.json({ questions: compileGrandchildQuiz(sources) });
}
