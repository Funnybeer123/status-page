import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";

export default async function SpokenPage() {
  const ctx = await requireFamily();
  const answers = await prisma.storyPromptAnswer.findMany({
    where: { prompt: { familyId: ctx.family.id }, assetId: { not: null } },
    include: { story: true, asset: true, prompt: true, author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="spoken-heading">Spoken answers</h1>
      <p className="mt-3 max-w-2xl text-bark">Story prompts answered out loud, kept with the story.</p>
      <ul className="mt-10 space-y-3" data-testid="spoken-list">
        {answers.map((answer) => (
          <li key={answer.id} className="paper-card p-5">
            <Link href={`/stories/${answer.storyId}`} className="font-display text-2xl text-seal">{answer.prompt.title}</Link>
            <p className="font-sans text-sm text-bark">{answer.author.name}</p>
            {answer.asset ? (
              <audio controls src={`/api/media/${answer.asset.storagePath}`} className="mt-3 w-full" />
            ) : null}
          </li>
        ))}
        {!answers.length ? <li className="text-bark">No spoken answers yet.</li> : null}
      </ul>
    </AppShell>
  );
}
