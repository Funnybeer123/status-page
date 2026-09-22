import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { GownWearForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileGownChain, gownHeading, gownWearLine } from "@/lib/christeningGown";

export default async function GownPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [gown, people] = await Promise.all([
    prisma.christeningGown.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { wears: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!gown) notFound();
  const chain = compileGownChain(
    gown.wears.map((wear) => ({
      id: wear.id,
      person: wear.person.displayName,
      personId: wear.personId,
      wornOn: wear.wornOn,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Christening gown</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="gown-heading">
        {gownHeading(gown.title, chain.length)}
      </h1>
      {gown.notes ? <p className="mt-3 text-bark">{gown.notes}</p> : null}
      {canWrite(ctx.role) ? (
        <GownWearForm
          gownId={gown.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="gown-chain">
        {chain.map((wear) => (
          <li key={wear.id} className="paper-card p-5">
            <Link href={`/people/${wear.personId}`} className="font-display text-2xl text-seal">
              {gownWearLine(wear.person, wear.wornKey)}
            </Link>
          </li>
        ))}
        {!chain.length ? <li className="text-bark">{gownHeading(gown.title, 0)}</li> : null}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href="/gowns" className="text-seal">All christening gowns</Link>
      </p>
    </AppShell>
  );
}
