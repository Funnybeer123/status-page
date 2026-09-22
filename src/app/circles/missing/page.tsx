import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileMissingCircles, missingCircleHeading } from "@/lib/storyCircles";

export default async function MissingCirclesPage() {
  const ctx = await requireFamily();
  const prompts = await prisma.storyPrompt.findMany({
    where: { familyId: ctx.family.id },
    include: {
      answers: { include: { story: { include: { teller: true } }, author: { select: { name: true } } } },
    },
  });
  const missing = compileMissingCircles(
    prompts.map((prompt) => ({
      id: prompt.id,
      title: prompt.title,
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
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-circles-heading">
        {missingCircleHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-circles-list">
        {missing.map((prompt) => (
          <li key={prompt.id} className="paper-card p-5">
            <Link href="/prompts" className="font-display text-2xl text-seal">
              {prompt.title}
            </Link>
            <p className="text-bark">{prompt.answers.length ? "Only one voice so far." : "No one has answered yet."}</p>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingCircleHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
