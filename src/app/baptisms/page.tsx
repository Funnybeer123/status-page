import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileBaptisms } from "@/lib/baptisms";
import { formatDate } from "@/lib/dates";

export default async function BaptismsPage() {
  const ctx = await requireFamily();
  const events = await prisma.lifeEvent.findMany({
    where: { familyId: ctx.family.id, kind: "baptism" },
    include: { person: true, place: true },
    orderBy: { happenedOn: "asc" },
  });
  const rows = compileBaptisms(
    events.map((event) => ({
      id: event.id,
      kind: event.kind,
      title: event.title,
      happenedOn: event.happenedOn,
      personId: event.personId,
      personName: event.person.displayName,
      place: event.place?.name,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="baptisms-heading">Baptisms</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Christenings recorded on the archive.{" "}
        <Link href="/midwives" className="text-seal">Midwives</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="baptisms-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">{row.personName}</Link>
            <p className="text-bark">
              {row.title}
              {row.happenedOn ? ` · ${formatDate(row.happenedOn)}` : ""}
              {row.place ? ` · ${row.place}` : ""}
            </p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">No baptisms recorded yet.</li> : null}
      </ul>
    </AppShell>
  );
}
