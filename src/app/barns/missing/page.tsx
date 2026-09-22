import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingBarnsHeading } from "@/lib/barnRaising";

export default async function MissingBarnsPage() {
  const ctx = await requireFamily();
  const barns = await prisma.barnRaising.findMany({
    where: { familyId: ctx.family.id },
    include: { crew: true },
  });
  const missing = barns.filter((barn) => !barn.crew.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-barns-heading">
        {missingBarnsHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-barns-list">
        {missing.map((barn) => (
          <li key={barn.id} className="paper-card p-5">
            <Link href={`/barns/${barn.id}`} className="font-display text-2xl text-seal">{barn.title}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingBarnsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
