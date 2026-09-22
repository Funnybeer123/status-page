import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { HeirloomForm } from "@/app/heirlooms/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";

export default async function HeirloomsPage() {
  const ctx = await requireFamily();
  const [people, heirlooms] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
    prisma.heirloom.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
      orderBy: { title: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="heirlooms-heading">Heirlooms</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Objects the family still keeps, and who they belonged to.{" "}
        <Link href="/loans" className="text-seal">Who borrowed what</Link>.
      </p>
      {canWrite(ctx.role) ? (
        <HeirloomForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="heirlooms-list">
        {heirlooms.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-display text-2xl">{item.title}</p>
            {item.person ? (
              <Link href={`/people/${item.person.id}`} className="font-sans text-sm text-seal">{item.person.displayName}</Link>
            ) : null}
            <p className="text-bark">{item.summary}</p>
            <p className="font-sans text-sm text-gold">{formatDate(item.acquiredAt, "")}</p>
          </li>
        ))}
        {!heirlooms.length ? <li className="text-bark">No heirlooms recorded.</li> : null}
      </ul>
    </AppShell>
  );
}
