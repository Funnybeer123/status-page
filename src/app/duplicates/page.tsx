import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { suggestDuplicates } from "@/lib/duplicates";
import { canWrite } from "@/lib/roles";

export default async function DuplicatesPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({ where: { familyId: ctx.family.id } });
  const pairs = suggestDuplicates(people);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="duplicates-heading">Suggested duplicates</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Names and dates that look like the same person. Merge stays a choice a relative makes.
      </p>
      <ul className="mt-10 space-y-4" data-testid="duplicates-list">
        {pairs.map((pair) => (
          <li key={`${pair.keepId}-${pair.dropId}`} className="paper-card p-5">
            <p className="font-display text-2xl">
              {pair.keepName} <span className="text-bark">and</span> {pair.dropName}
            </p>
            <p className="font-sans text-sm text-gold">{pair.reasons.join(" · ")}</p>
            {canWrite(ctx.role) ? (
              <Link href={`/people/${pair.keepId}`} className="mt-3 inline-block font-sans text-sm text-seal">
                Review and merge on {pair.keepName}
              </Link>
            ) : null}
          </li>
        ))}
        {!pairs.length ? <li className="text-bark">No likely duplicates yet.</li> : null}
      </ul>
    </AppShell>
  );
}
