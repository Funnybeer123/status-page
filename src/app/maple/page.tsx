import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { MapleForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileMaple, mapleCampLine, mapleCampsHeading } from "@/lib/mapleCamp";

export default async function Page() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.mapleCamp.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileMaple(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      gallons: row.gallons,
      year: row.year,
      place: row.place,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="maple-heading">
        {mapleCampsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who boiled at the maple-sugar camp, and how many gallons. 
        <Link href="/maple/missing" className="text-seal">Missing maple camp</Link>
      </p>
      {canWrite(ctx.role) ? (
        <MapleForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="maple-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{mapleCampLine(row.person, row.gallons, row.place, row.year)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{mapleCampsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={mapleCampsHeading(compiled.length)} path="/maple" />
    </AppShell>
  );
}
