import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileYearsMarried, longestMarriageHeading } from "@/lib/marriedYears";

export default async function LongestMarriagePage() {
  const ctx = await requireFamily();
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({
      where: { familyId: ctx.family.id, deletedAt: null },
      select: { id: true, displayName: true, deathDate: true },
    }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const rows = compileYearsMarried(people, relationships);
  const longest = rows[0] || null;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="longest-married-heading">
        {longestMarriageHeading(longest)}
      </h1>
      {longest ? (
        <article className="mt-10 paper-card p-8" data-testid="longest-married">
          <p className="font-display text-3xl">{longest.line}</p>
          <p className="mt-3 text-bark">
            <Link href={`/people/${longest.aId}`} className="text-seal">{longest.aName}</Link>
            {" and "}
            <Link href={`/people/${longest.bId}`} className="text-seal">{longest.bName}</Link>
          </p>
        </article>
      ) : (
        <p className="mt-10 text-bark">{longestMarriageHeading(null)}</p>
      )}
    </AppShell>
  );
}
