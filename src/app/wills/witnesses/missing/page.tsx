import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingWillWitnessesHeading } from "@/lib/willWitnesses";

export default async function MissingWillWitnessesPage() {
  const ctx = await requireFamily();
  const wills = await prisma.document.findMany({
    where: { familyId: ctx.family.id, kind: DocKind.will, deletedAt: null, willWitnesses: { none: {} } },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-will-witnesses-heading">
        {missingWillWitnessesHeading(wills.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-will-witnesses-list">
        {wills.map((will) => (
          <li key={will.id} className="paper-card p-5">
            <Link href="/wills/witnesses" className="font-display text-2xl text-seal">{will.title}</Link>
          </li>
        ))}
        {!wills.length ? <li className="text-bark">{missingWillWitnessesHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
