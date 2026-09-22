import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RsvpButton } from "@/app/reunions/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function ReunionPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { guests: { include: { person: true } } },
  });
  if (!reunion) notFound();
  const coming = reunion.guests.filter((guest) => guest.coming);
  const notComing = reunion.guests.filter((guest) => !guest.coming);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Reunion</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="reunion-title">{reunion.title}</h1>
      <p className="mt-3 text-bark" data-testid="reunion-place">
        {formatDate(reunion.happenedOn)} · {reunion.place}
      </p>
      {reunion.notes ? <p className="mt-2 text-bark">{reunion.notes}</p> : null}
      <section className="mt-10">
        <h2 className="font-display text-3xl">Who’s coming</h2>
        <ul className="mt-4 space-y-2" data-testid="reunion-coming">
          {coming.map((guest) => (
            <li key={guest.personId} className="paper-card flex items-center justify-between p-4">
              <span>{guest.person.displayName}</span>
              {canWrite(ctx.role) ? <RsvpButton reunionId={reunion.id} personId={guest.personId} coming /> : null}
            </li>
          ))}
          {!coming.length ? <li className="text-bark">No one has said they are coming.</li> : null}
        </ul>
      </section>
      {notComing.length ? (
        <section className="mt-8">
          <h2 className="font-display text-3xl">Not coming</h2>
          <ul className="mt-4 space-y-2">
            {notComing.map((guest) => (
              <li key={guest.personId} className="paper-card flex items-center justify-between p-4">
                <span>{guest.person.displayName}</span>
                {canWrite(ctx.role) ? <RsvpButton reunionId={reunion.id} personId={guest.personId} coming={false} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
