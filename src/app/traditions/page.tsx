import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TraditionForm } from "@/app/traditions/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function TraditionsPage() {
  const ctx = await requireFamily();
  const [people, traditions] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
    prisma.tradition.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
      orderBy: { title: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="traditions-heading">Family traditions</h1>
      <p className="mt-3 max-w-2xl text-bark">The days and habits the family still keeps, and who started them.</p>
      {canWrite(ctx.role) ? (
        <TraditionForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="traditions-list">
        {traditions.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-display text-2xl">{item.title}</p>
            {item.person ? (
              <Link href={`/people/${item.person.id}`} className="font-sans text-sm text-seal">{item.person.displayName}</Link>
            ) : null}
            {item.season ? <p className="font-sans text-sm text-gold">{item.season}</p> : null}
            <p className="text-bark">{item.summary}</p>
          </li>
        ))}
        {!traditions.length ? <li className="text-bark">No traditions recorded.</li> : null}
      </ul>
    </AppShell>
  );
}
