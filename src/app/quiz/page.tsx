import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { QuizReveal } from "@/app/quiz/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isLiving } from "@/lib/privacy";
import { compileGrandchildQuiz } from "@/lib/grandchildQuiz";
import { isSecretLocked } from "@/lib/secretUntil";

export default async function QuizPage() {
  const ctx = await requireFamily();
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
    prisma.story.findMany({ where: { familyId: ctx.family.id }, include: { people: true } }),
  ]);
  const questions = compileGrandchildQuiz([
    ...letters
      .filter((letter) => !isSecretLocked(letter.secretUntil) && (!letter.people.length || letter.people.some((item) => !living.has(item.personId))))
      .map((letter) => ({
        id: letter.id,
        title: letter.title,
        kind: "letter",
        body: letter.transcript,
        href: `/letters/${letter.id}`,
      })),
    ...stories
      .filter((story) => (!story.tellerPersonId || !living.has(story.tellerPersonId)) && (!story.people.length || story.people.some((item) => !living.has(item.personId))))
      .map((story) => ({
        id: story.id,
        title: story.title,
        kind: "story",
        body: story.body,
        href: `/stories/${story.id}`,
      })),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">For a grandchild</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="quiz-heading">Family quiz</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Questions from the letters and stories. The answers cite the page they came from.
      </p>
      <ol className="mt-10 space-y-4" data-testid="quiz-list">
        {questions.map((item, index) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">Question {index + 1}</p>
            <p className="mt-2 font-display text-2xl">{item.question}</p>
            <QuizReveal answer={item.answer} href={item.href} sourceTitle={item.sourceTitle} />
          </li>
        ))}
        {!questions.length ? <li className="text-bark">Add a letter or a story first.</li> : null}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href="/ask/grandchild" className="text-seal">Ask simply</Link>
        {" · "}
        <Link href="/crossword" className="text-seal">Family crossword</Link>
      </p>
    </AppShell>
  );
}
