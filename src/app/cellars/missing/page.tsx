import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingCellarsHeading } from "@/lib/cycloneCellar";

export default async function MissingCellarsPage() {
  const ctx = await requireFamily();
  const rows = await prisma.cycloneCellar.findMany({
    where: { familyId: ctx.family.id },
    include: { guests: true },
  });
  const missing = rows.filter((row) => !row.guests.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-cellars-heading">
        {missingCellarsHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-cellars-list">
        {missing.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/cellars/${row.id}`} className="font-display text-2xl text-seal">
              {row.storm}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingCellarsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
