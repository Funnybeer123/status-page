import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function SavedAskPage() {
  const ctx = await requireFamily();
  const conversations = await prisma.askConversation.findMany({
    where: { familyId: ctx.family.id, userId: ctx.session.user.id, saved: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="saved-ask-heading">Saved questions</h1>
      <p className="mt-3 max-w-2xl text-bark">Questions a relative can reopen, with the answers still beside the sources.</p>
      <ul className="mt-10 space-y-3" data-testid="saved-ask-list">
        {conversations.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={`/ask?conversationId=${item.id}`} className="font-display text-2xl text-seal">{item.title}</Link>
            <p className="font-sans text-sm text-gold">{formatDate(item.updatedAt)}</p>
          </li>
        ))}
        {!conversations.length ? <li className="text-bark">No saved questions yet.</li> : null}
      </ul>
    </AppShell>
  );
}
