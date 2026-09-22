import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { homeDuplicateHeading, mergeHomesHeading, suggestHomeDuplicates } from "@/lib/homeDuplicates";

export default async function HomeDuplicatesPage() {
  const ctx = await requireFamily();
  const homes = await prisma.familyHome.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { title: "asc" },
  });
  const groups = suggestHomeDuplicates(homes);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">
        <Link href="/homes" className="text-seal">Homes</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="home-duplicates-heading">
        {homeDuplicateHeading(groups.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Same street and town, or the same house name twice.</p>
      <p className="mt-3 font-sans text-sm">
        <Link href="/homes/merge" className="text-seal">Merge a pair</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="home-duplicates-list">
        {groups.map((group) => (
          <li key={group.keep.id} className="paper-card p-5">
            <p className="font-display text-2xl">{group.keep.title}</p>
            <p className="text-bark">
              {group.drop.map((home) => mergeHomesHeading(group.keep.title, home.title)).join(" · ")}
            </p>
          </li>
        ))}
        {!groups.length ? <li className="text-bark">No duplicate houses.</li> : null}
      </ul>
    </AppShell>
  );
}
