import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { ShellingForm, ShellingGuestForm } from "@/app/shelling/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileShelling, compileShellingGuests, shellingBeeHeading, shellingBeesHeading, shellingGuestLine } from "@/lib/shellingBee";

export default async function ShellingPage() {
  const ctx = await requireFamily();
  const [bees, people] = await Promise.all([
    prisma.shellingBee.findMany({
      where: { familyId: ctx.family.id },
      include: { owner: true, guests: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileShelling(bees.map((bee) => ({ ...bee, owner: bee.owner.displayName })));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="shelling-heading">
        {shellingBeesHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who came to the corn-shelling bee, and whose crib it was.{" "}
        <Link href="/husking" className="text-seal">Husking bees</Link>
        {" · "}
        <Link href="/shelling/missing" className="text-seal">Bees still needing a roll</Link>
      </p>
      {canWrite(ctx.role) ? (
        <>
          <ShellingForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
          <ShellingGuestForm
            people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
            bees={compiled.map((bee) => ({ id: bee.id, title: shellingBeeHeading(bee.owner, bee.guests.length) }))}
          />
        </>
      ) : null}
      <ul className="mt-10 space-y-6" data-testid="shelling-list">
        {compiled.map((bee) => {
          const guests = compileShellingGuests(
            bee.guests.map((row) => ({
              id: row.id,
              person: row.person.displayName,
              personId: row.personId,
            })),
          );
          return (
            <li key={bee.id} className="paper-card p-8">
              <Link href={`/shelling/${bee.id}`} className="font-display text-3xl text-seal">
                {shellingBeeHeading(bee.owner, guests.length)}
              </Link>
              <ol className="mt-4 space-y-2" data-testid="shelling-roll">
                {guests.map((row) => (
                  <li key={row.id} className="text-bark">{shellingGuestLine(row.person)}</li>
                ))}
              </ol>
            </li>
          );
        })}
        {!compiled.length ? <li className="text-bark">{shellingBeesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={shellingBeesHeading(compiled.length)} path="/shelling" />
    </AppShell>
  );
}
