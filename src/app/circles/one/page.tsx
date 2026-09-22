import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileOneVoicePrompts, oneVoiceHeading } from "@/lib/storyCircles";

export default async function OneVoicePage() {
  const ctx = await requireFamily();
  const prompts = await prisma.storyPrompt.findMany({
    where: { familyId: ctx.family.id },
    include: {
      answers: { include: { story: { include: { teller: true } }, author: { select: { name: true } } } },
    },
  });
  const one = compileOneVoicePrompts(
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
      <h1 className="mt-2 font-display text-4xl" data-testid="one-voice-heading">
        {oneVoiceHeading(one.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="one-voice-list">
        {one.map((prompt) => (
          <li key={prompt.id} className="paper-card p-5">
            <Link href="/prompts" className="font-display text-2xl text-seal">
              {prompt.title}
            </Link>
            <p className="text-bark">{prompt.answers[0]?.teller} answered. A circle needs one more voice.</p>
          </li>
        ))}
        {!one.length ? <li className="text-bark">{oneVoiceHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
