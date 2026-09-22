import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { familyHistory, filterMissing } from "@/lib/timeline";

export default async function ResearchPage() {
  const ctx = await requireFamily();
  const history = await familyHistory(ctx.family.id, ctx.role);
  const missing = filterMissing(history.missing, history.people, {});
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="research-heading">Still to ask</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Blank births, undated marriages, and letters without a day — things a relative can still fill in.
        Written questions live on <Link href="/tasks" className="text-seal">Research tasks</Link>.
        The usual document types open on the{" "}
        <Link href="/research/checklist" className="text-seal">research checklist</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="research-list">
        {missing.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{item.kind}</p>
            <Link href={item.href} className="font-display text-2xl text-seal">{item.title}</Link>
            <p className="text-bark">{item.summary}</p>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">The obvious gaps are filled.</li> : null}
      </ul>
    </AppShell>
  );
}
