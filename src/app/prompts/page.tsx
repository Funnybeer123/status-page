import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PromptAnswer, PromptForm } from "@/app/prompts/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function PromptsPage() {
  const ctx = await requireFamily();
  const prompts = await prisma.storyPrompt.findMany({
    where: { familyId: ctx.family.id },
    include: { answers: { include: { story: true, asset: true, author: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="prompts-heading">Story prompts</h1>
      <p className="mt-3 max-w-2xl text-bark">Questions a relative can answer in their own words.</p>
      {canWrite(ctx.role) ? <PromptForm /> : null}
      <ul className="mt-10 space-y-4" data-testid="prompts-list">
        {prompts.map((prompt) => (
          <li key={prompt.id} className="paper-card p-5">
            <h2 className="font-display text-2xl">{prompt.title}</h2>
            {prompt.body ? <p className="text-bark">{prompt.body}</p> : null}
            <ul className="mt-4 space-y-2">
              {prompt.answers.map((answer) => (
                <li key={answer.id}>
                  <Link href={`/stories/${answer.story.id}`} className="text-seal">{answer.story.title}</Link>
                  <span className="ml-2 font-sans text-sm text-bark">{answer.author.name}</span>
                  {answer.story.body ? <p className="mt-1 text-bark">{answer.story.body}</p> : null}
                  {answer.asset ? (
                    <audio controls src={`/api/media/${answer.asset.storagePath}`} className="mt-2 w-full" data-testid="spoken-answer" />
                  ) : null}
                </li>
              ))}
            </ul>
            {canWrite(ctx.role) ? <PromptAnswer promptId={prompt.id} /> : null}
          </li>
        ))}
        {!prompts.length ? <li className="text-bark">No prompts yet.</li> : null}
      </ul>
    </AppShell>
  );
}
