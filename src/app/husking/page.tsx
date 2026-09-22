import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { HuskingForm, HuskingGuestForm } from "@/app/township/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileHusking, compileHuskingGuests, huskingBeeHeading, huskingBeesHeading, huskingGuestLine } from "@/lib/huskingBee";

export default async function HuskingPage() {
  const ctx = await requireFamily();
  const [bees, people] = await Promise.all([
    prisma.huskingBee.findMany({
      where: { familyId: ctx.family.id },
      include: { owner: true, guests: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileHusking(bees.map((bee) => ({ ...bee, owner: bee.owner.displayName })));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="husking-heading">
        {huskingBeesHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who came to the husking bee, and whose field it was.{" "}
        <Link href="/bees" className="text-seal">Quilting bees</Link>
        {" · "}
        <Link href="/husking/missing" className="text-seal">Bees still needing a roll</Link>
      </p>
      {canWrite(ctx.role) ? (
        <>
          <HuskingForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
          <HuskingGuestForm
            people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
            bees={compiled.map((bee) => ({ id: bee.id, title: huskingBeeHeading(bee.owner, bee.guests.length) }))}
          />
        </>
      ) : null}
      <ul className="mt-10 space-y-6" data-testid="husking-list">
        {compiled.map((bee) => {
          const guests = compileHuskingGuests(
            bee.guests.map((row) => ({
              id: row.id,
              person: row.person.displayName,
              personId: row.personId,
            })),
          );
          return (
            <li key={bee.id} className="paper-card p-8">
              <Link href={`/husking/${bee.id}`} className="font-display text-3xl text-seal">
                {huskingBeeHeading(bee.owner, guests.length)}
              </Link>
              <ol className="mt-4 space-y-2" data-testid="husking-roll">
                {guests.map((row) => (
                  <li key={row.id} className="text-bark">{huskingGuestLine(row.person)}</li>
                ))}
              </ol>
            </li>
          );
        })}
        {!compiled.length ? <li className="text-bark">{huskingBeesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={huskingBeesHeading(compiled.length)} path="/husking" />
    </AppShell>
  );
}
