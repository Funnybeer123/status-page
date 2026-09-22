import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { SickForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileSickWatches, sickWatchLine, sickWatchesHeading } from "@/lib/sickWatch";

export default async function SickPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.sickWatch.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, sick: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileSickWatches(
    rows.map((row) => ({
      id: row.id,
      sitter: row.person.displayName,
      sick: row.sick.displayName,
      sickId: row.sickId,
      personId: row.personId,
      satOn: row.satOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="sick-heading">
        {sickWatchesHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who sat up with the sick, separate from a deathwatch.{" "}
        <Link href="/watches" className="text-seal">Deathwatch</Link>
        {" · "}
        <Link href="/sick/missing" className="text-seal">Missing sick-watch</Link>
      </p>
      {canWrite(ctx.role) ? (
        <SickForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="sick-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{sickWatchLine(row.sitter, row.sick, row.satKey)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{sickWatchesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={sickWatchesHeading(compiled.length)} path="/sick" />
    </AppShell>
  );
}
