import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { thereHeading, thereLine } from "@/lib/cityDirectory";
import { formatDate } from "@/lib/dates";
import { isLiving } from "@/lib/privacy";

export default async function TherePage() {
  const ctx = await requireFamily();
  const [events, people, rows] = await Promise.all([
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true },
      orderBy: { happenedOn: "desc" },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.eventWitness.findMany({
      where: { familyId: ctx.family.id, role: "there" },
      include: { person: true, event: true },
    }),
  ]);
  const living = people.filter((person) => isLiving(person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="there-heading">{thereHeading(rows.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">A living relative marks an event they attended — “I was there.”</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="there"
          action="/api/there"
          testId="there-form"
          submit="I was there"
          fields={[
            {
              name: "eventId",
              options: events.map((event) => ({
                id: event.id,
                label: `${event.title} · ${event.person.displayName}`,
              })),
              label: "The event",
            },
            {
              name: "personId",
              people: living.map((person) => ({ id: person.id, displayName: person.displayName })),
              label: "Who was there",
            },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="there-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{thereLine(row.person.displayName, row.event.title)}</p>
            <p className="font-sans text-sm text-gold">{formatDate(row.event.happenedOn, "")}</p>
            <p className="mt-2">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {" · "}
              <Link href={`/people/${row.event.personId}`} className="text-seal">{row.event.title}</Link>
            </p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">No one has said they were there yet.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/there/suggest" className="text-seal">Events you have not marked</Link>
      </p>
    </AppShell>
  );
}
