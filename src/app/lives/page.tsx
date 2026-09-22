import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { LivesForm } from "@/app/attach/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { familyHistory, filterHistory } from "@/lib/timeline";
import { formatDate } from "@/lib/dates";
import { compileTogether, marksFromHistory, twoLivesHeading, twoLivesLine } from "@/lib/twoLives";

export default async function TwoLivesPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, deletedAt: null },
    orderBy: { displayName: "asc" },
  });
  const left = people.find((person) => person.id === params.a);
  const right = people.find((person) => person.id === params.b);
  const history = left && right ? await familyHistory(ctx.family.id, ctx.role) : null;
  const items =
    history && left && right
      ? compileTogether(
          marksFromHistory(filterHistory(history.entries, { personId: left.id }), left.id, left.displayName),
          marksFromHistory(filterHistory(history.entries, { personId: right.id }), right.id, right.displayName),
        )
      : [];
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="two-lives-heading">
        {left && right ? twoLivesHeading(left.displayName, right.displayName) : "Two lives on one timeline"}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The same years, one list. Side-by-side comparison stays on{" "}
        <Link href="/compare" className="text-seal">Compare</Link>.
      </p>
      <LivesForm
        people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        aId={left?.id}
        bId={right?.id}
      />
      {left && right ? (
        <ol className="mt-10 space-y-3" data-testid="two-lives">
          {items.map((item) => (
            <li key={item.id} className="paper-card p-5">
              <Link href={item.href} className="font-display text-2xl text-seal">{item.title}</Link>
              <p className="text-bark">{twoLivesLine(item)}</p>
              <p className="font-sans text-sm text-gold">{formatDate(item.date, "Undated")}</p>
            </li>
          ))}
          {!items.length ? <li className="text-bark">Nothing dated on either life yet.</li> : null}
        </ol>
      ) : null}
    </AppShell>
  );
}
