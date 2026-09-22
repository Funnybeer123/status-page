import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { askStoriesHeading } from "@/lib/askStory";

export default async function AskStoriesPage() {
  const ctx = await requireFamily();
  const conversations = await prisma.askConversation.findMany({
    where: { familyId: ctx.family.id, storyId: { not: null } },
    include: { story: { include: { citations: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="ask-stories-heading">
        {askStoriesHeading(conversations.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Ask answers kept as editable family stories, with the citations still attached.{" "}
        <Link href="/ask" className="text-seal">Ask again</Link>.
      </p>
      <ul className="mt-10 space-y-3">
        {conversations.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={`/stories/${item.storyId}`} className="font-display text-2xl text-seal">
              {item.story?.title || item.title}
            </Link>
            <p className="text-bark">{item.story?.citations.length ?? 0} citations kept</p>
          </li>
        ))}
        {!conversations.length ? <li className="text-bark">No Ask answers saved as stories yet.</li> : null}
      </ul>
    </AppShell>
  );
}
