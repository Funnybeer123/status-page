import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { CheckinButton } from "@/app/alive-when/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { checkinHeading, compileCheckin } from "@/lib/reunionCheckin";

export default async function ReunionCheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { guests: { include: { person: true } } },
  });
  if (!reunion) notFound();
  const guests = compileCheckin(reunion.guests);
  const arrived = guests.filter((guest) => guest.arrived).length;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Reunion check-in</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="checkin-heading">
        {checkinHeading(reunion.title, arrived, guests.length)}
      </h1>
      <p className="mt-3 text-bark">
        Mark a guest as arrived at the hall door.{" "}
        <Link href={`/reunions/${reunion.id}/kiosk`} className="text-seal">Kiosk</Link>
        {" · "}
        <Link href={`/reunions/${reunion.id}`} className="text-seal">The reunion</Link>
        {" · "}
        <Link href="/reunions/checkin/missing" className="text-seal">Not checked in</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="checkin-list">
        {guests.map((guest) => (
          <li key={guest.personId} className="paper-card flex flex-wrap items-baseline justify-between gap-3 p-5">
            <div>
              <p className="font-display text-2xl">{guest.name}</p>
              <p className="text-bark" data-testid={guest.arrived ? "checkin-arrived" : "checkin-waiting"}>
                {guest.line}
              </p>
            </div>
            <CheckinButton reunionId={reunion.id} personId={guest.personId} arrived={guest.arrived} />
          </li>
        ))}
        {!guests.length ? <li className="text-bark">No guests on this reunion yet.</li> : null}
      </ul>
      <CiteBlock title={checkinHeading(reunion.title, arrived, guests.length)} path={`/reunions/${reunion.id}/checkin`} />
    </AppShell>
  );
}
