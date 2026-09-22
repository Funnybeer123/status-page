import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileStoryCircles, storyCirclesHeading } from "@/lib/storyCircles";

export default async function CirclesPage() {
  const ctx = await requireFamily();
  const prompts = await prisma.storyPrompt.findMany({
    where: { familyId: ctx.family.id },
    include: {
      answers: { include: { story: { include: { teller: true } }, author: { select: { name: true } } } },
    },
  });
  const circles = compileStoryCircles(
    prompts.map((prompt) => ({
      id: prompt.id,
      title: prompt.title,
      body: prompt.body,
      answers: prompt.answers.map((answer) => ({
        id: answer.id,
        teller: answer.story.teller?.displayName || answer.author.name,
        body: answer.story.body,
        href: `/stories/${answer.story.id}`,
      })),
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="story-circles-heading">
        {storyCirclesHeading(circles.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Several relatives answer the same prompt, shown together.{" "}
        <Link href="/prompts" className="text-seal">Story prompts</Link>
        {" · "}
        <Link href="/circles/missing" className="text-seal">Prompts still needing a circle</Link>
        {" · "}
        <Link href="/circles/one" className="text-seal">Only one voice</Link>
      </p>
      <ul className="mt-10 space-y-4" data-testid="story-circles-list">
        {circles.map((circle) => (
          <li key={circle.id} className="paper-card p-5">
            <Link href={`/circles/${circle.id}`} className="font-display text-2xl text-seal">
              {circle.heading}
            </Link>
            <ul className="mt-3 space-y-2">
              {circle.answers.map((answer) => (
                <li key={answer.id}>
                  <p className="font-sans text-sm text-gold">{answer.teller}</p>
                  <p className="text-bark">{answer.body}</p>
                </li>
              ))}
            </ul>
          </li>
        ))}
        {!circles.length ? <li className="text-bark">{storyCirclesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={storyCirclesHeading(circles.length)} path="/circles" />
    </AppShell>
  );
}
