import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingConfirmationsHeading } from "@/lib/confirmationClass";

export default async function MissingConfirmationsPage() {
  const ctx = await requireFamily();
  const classes = await prisma.confirmationClass.findMany({
    where: { familyId: ctx.family.id },
    include: { pupils: true },
  });
  const missing = classes.filter((row) => !row.pupils.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-confirmations-heading">
        {missingConfirmationsHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-confirmations-list">
        {missing.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/confirmations/${row.id}`} className="font-display text-2xl text-seal">
              {row.church} · {row.year}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingConfirmationsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
