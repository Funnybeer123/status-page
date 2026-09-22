import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { OrganForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileOrgans, parlorOrganLine, parlorOrgansHeading } from "@/lib/parlorOrgan";

export default async function OrgansPage() {
  const ctx = await requireFamily();
  const [rows, people] = await Promise.all([
    prisma.parlorOrgan.findMany({ where: { familyId: ctx.family.id }, include: { person: true } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileOrgans(
    rows.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      title: row.title,
      place: row.place,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="organs-heading">
        {parlorOrgansHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        The parlor organ, and who sat down to play it.{" "}
        <Link href="/organs/missing" className="text-seal">Missing organ</Link>
      </p>
      {canWrite(ctx.role) ? (
        <OrganForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="organs-list">
        {compiled.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{parlorOrganLine(row.person, row.title, row.place)}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">{parlorOrgansHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={parlorOrgansHeading(compiled.length)} path="/organs" />
    </AppShell>
  );
}
