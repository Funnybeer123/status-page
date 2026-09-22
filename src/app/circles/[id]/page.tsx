import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isStoryCircle, storyCircleHeading } from "@/lib/storyCircles";

export default async function CirclePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const prompt = await prisma.storyPrompt.findFirst({
    where: { id, familyId: ctx.family.id },
    include: {
      answers: { include: { story: { include: { teller: true } }, author: { select: { name: true } } } },
    },
  });
  if (!prompt || !isStoryCircle(prompt.answers)) notFound();
  const answers = prompt.answers.map((answer) => ({
    id: answer.id,
    teller: answer.story.teller?.displayName || answer.author.name,
    body: answer.story.body,
    href: `/stories/${answer.story.id}`,
  }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Story circle</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="story-circle-heading">
        {storyCircleHeading(prompt.title, answers.length)}
      </h1>
      <p className="mt-3 text-bark">
        {prompt.body || "The same kitchen-table question, answered in more than one voice."}{" "}
        <Link href="/circles" className="text-seal">All circles</Link>
        {" · "}
        <Link href="/prompts" className="text-seal">Prompts</Link>
      </p>
      <ul className="mt-10 space-y-4" data-testid="story-circle-answers">
        {answers.map((answer) => (
          <li key={answer.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{answer.teller}</p>
            <p className="mt-2 text-lg leading-relaxed">{answer.body}</p>
            <Link href={answer.href} className="mt-3 inline-block text-seal">
              Open this answer
            </Link>
          </li>
        ))}
      </ul>
      <CiteBlock title={storyCircleHeading(prompt.title, answers.length)} path={`/circles/${prompt.id}`} />
    </AppShell>
  );
}
