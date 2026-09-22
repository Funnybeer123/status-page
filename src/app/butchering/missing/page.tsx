import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingButcheringHeading } from "@/lib/butchering";

export default async function MissingButcheringPage() {
  const ctx = await requireFamily();
  const crews = await prisma.butcheringCrew.findMany({
    where: { familyId: ctx.family.id },
    include: { workers: true },
  });
  const missing = crews.filter((crew) => !crew.workers.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-butchering-heading">
        {missingButcheringHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-butchering-list">
        {missing.map((crew) => (
          <li key={crew.id} className="paper-card p-5">
            <Link href={`/butchering/${crew.id}`} className="font-display text-2xl text-seal">
              {crew.title}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingButcheringHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
