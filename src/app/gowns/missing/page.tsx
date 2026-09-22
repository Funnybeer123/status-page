import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingGownsHeading } from "@/lib/christeningGown";

export default async function MissingGownsPage() {
  const ctx = await requireFamily();
  const gowns = await prisma.christeningGown.findMany({
    where: { familyId: ctx.family.id },
    include: { wears: true },
  });
  const missing = gowns.filter((gown) => !gown.wears.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-gowns-heading">
        {missingGownsHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-gowns-list">
        {missing.map((gown) => (
          <li key={gown.id} className="paper-card p-5">
            <Link href={`/gowns/${gown.id}`} className="font-display text-2xl text-seal">{gown.title}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingGownsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
