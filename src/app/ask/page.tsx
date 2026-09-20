import { AppShell } from "@/components/AppShell";
import { AskBox } from "@/components/AskBox";

export default function AskPage() {
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">From the family&apos;s own words</p>
      <h1 className="mt-2 font-display text-4xl">Ask</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Try the question a grandchild would ask. No API key is required for the seeded Hart archive.
      </p>
      <div className="mt-8">
        <AskBox suggested="How did grandma meet grandpa?" />
      </div>
    </AppShell>
  );
}
