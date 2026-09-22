import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { PewForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compilePews, pewLine, pewsHeading } from "@/lib/churchPew";

export default async function PewsPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.churchPew.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compilePews(
    rows.map((row) => ({
      id: row.id,
      church: row.church,
      pewNumber: row.pewNumber,
      person: row.person.displayName,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="pews-heading">
        {pewsHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The rented church pew, and who sat there.{" "}
        <Link href="/pews/missing" className="text-seal">Missing rented pew</Link>
        {" · "}
        <Link href="/abstracts" className="text-seal">Land abstracts</Link>
      </p>
      {canWrite(ctx.role) ? (
        <PewForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="pews-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{pewLine(row.church, row.pewNumber, row.person)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{pewsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={pewsHeading(compiled.length)} path="/pews" />
    </AppShell>
  );
}
