import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { GownForm, GownWearForm } from "@/app/pallbearer/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileGownChain, gownHeading, gownWearLine, gownsHeading } from "@/lib/christeningGown";

export default async function GownsPage() {
  const ctx = await requireFamily();
  const [gowns, people] = await Promise.all([
    prisma.christeningGown.findMany({
      where: { familyId: ctx.family.id },
      include: { wears: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="gowns-heading">
        {gownsHeading(gowns.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who wore the same christening gown, in order.{" "}
        <Link href="/gowns/missing" className="text-seal">Gowns still needing a wearer</Link>
      </p>
      {canWrite(ctx.role) ? (
        <>
          <GownForm />
          <GownWearForm
            people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
            gowns={gowns.map((gown) => ({ id: gown.id, title: gown.title }))}
          />
        </>
      ) : null}
      <ul className="mt-10 space-y-6" data-testid="gowns-list">
        {gowns.map((gown) => {
          const chain = compileGownChain(
            gown.wears.map((wear) => ({
              id: wear.id,
              person: wear.person.displayName,
              personId: wear.personId,
              wornOn: wear.wornOn,
            })),
          );
          return (
            <li key={gown.id} className="paper-card p-8">
              <Link href={`/gowns/${gown.id}`} className="font-display text-3xl text-seal">
                {gownHeading(gown.title, chain.length)}
              </Link>
              <ol className="mt-4 space-y-2" data-testid="gown-chain">
                {chain.map((wear) => (
                  <li key={wear.id} className="text-bark">
                    {gownWearLine(wear.person, wear.wornKey)}
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
        {!gowns.length ? <li className="text-bark">{gownsHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={gownsHeading(gowns.length)} path="/gowns" />
    </AppShell>
  );
}
