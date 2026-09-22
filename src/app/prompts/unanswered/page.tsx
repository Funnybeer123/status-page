import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PromptAnswer } from "@/app/prompts/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { unansweredQuestionsHeading } from "@/lib/todayQuestion";

export default async function UnansweredPromptsPage() {
  const ctx = await requireFamily();
  const prompts = await prisma.storyPrompt.findMany({
    where: { familyId: ctx.family.id, answers: { none: {} } },
    orderBy: { createdAt: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="unanswered-heading">
        {unansweredQuestionsHeading(prompts.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Questions that still need a story.{" "}
        <Link href="/prompts" className="text-seal">All prompts</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="unanswered-list">
        {prompts.map((prompt) => (
          <li key={prompt.id} className="paper-card p-5">
            <h2 className="font-display text-2xl">{prompt.title}</h2>
            {prompt.body ? <p className="text-bark">{prompt.body}</p> : null}
            {canWrite(ctx.role) ? <PromptAnswer promptId={prompt.id} /> : null}
          </li>
        ))}
        {!prompts.length ? <li className="text-bark">Every family question has an answer.</li> : null}
      </ul>
    </AppShell>
  );
}
