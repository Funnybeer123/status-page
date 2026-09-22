import { AppShell } from "@/components/AppShell";
import { AskBox } from "@/components/AskBox";
import { requireFamily } from "@/lib/family";
import { loadConversation, parseSources } from "@/lib/askConversations";

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const conversation = params.conversationId
    ? await loadConversation(ctx.family.id, ctx.session.user.id, params.conversationId)
    : null;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">From the family&apos;s own words</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="ask-heading">Ask</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Try the question a grandchild would ask. A follow-up stays in the same conversation and still cites the letters.
      </p>
      <div className="mt-8">
        <AskBox
          suggested="How did grandma meet grandpa?"
          conversationId={conversation?.id}
          saved={conversation?.saved}
          initialMessages={
            conversation?.turns.map((turn) => ({
              role: turn.role as "user" | "assistant",
              text: turn.text,
              sources: parseSources(turn.sourcesJson),
            })) ?? []
          }
        />
      </div>
    </AppShell>
  );
}
