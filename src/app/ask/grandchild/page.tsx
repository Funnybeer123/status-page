import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AskBox } from "@/components/AskBox";
import { requireFamily } from "@/lib/family";

export default async function GrandchildAskPage() {
  await requireFamily();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">For a grandchild</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="grandchild-ask-heading">Ask simply</h1>
      <p className="mt-3 max-w-2xl text-bark">
        A shorter answer from stories, letters, and photographs. Living relatives stay off the page.
      </p>
      <div className="mt-8">
        <AskBox suggested="How did grandma meet grandpa?" action="/api/ask/grandchild" persist={false} />
      </div>
      <p className="mt-8 font-sans text-sm">
        <Link href="/ask" className="text-seal">Full Ask with sources</Link>
      </p>
    </AppShell>
  );
}
