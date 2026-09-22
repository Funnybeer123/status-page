import Link from "next/link";
import { notFound } from "next/navigation";
import { EventKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { filterAssetsForAudience } from "@/lib/privacy";
import { coupleLine, sameCalendarDay, weddingPartyHeading, weddingPhotosHeading, witnessLine } from "@/lib/weddingParty";

export default async function WeddingPartyPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const event = await prisma.lifeEvent.findFirst({
    where: { id, familyId: ctx.family.id, kind: EventKind.marriage },
    include: { person: true, otherPerson: true, place: true, witnesses: { include: { person: true } } },
  });
  if (!event) notFound();
  const photos = await prisma.asset.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
    include: { tags: { include: { person: true } } },
  });
  const dayPhotos = filterAssetsForAudience(
    photos.filter((photo) => sameCalendarDay(photo.capturedAt, event.happenedOn)),
    ctx.role,
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Wedding party</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="wedding-party-heading">
        {weddingPartyHeading(event.person.displayName, event.otherPerson?.displayName)}
      </h1>
      <p className="mt-3 text-bark" data-testid="wedding-couple">
        {coupleLine(event.person.displayName, event.otherPerson?.displayName)}
        {event.happenedOn ? ` · ${formatDate(event.happenedOn)}` : ""}
        {event.place ? ` · ${event.place.name}` : ""}
      </p>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Witnesses</h2>
        <ul className="mt-4 space-y-3" data-testid="wedding-witnesses">
          {event.witnesses.map((row) => (
            <li key={row.id} className="paper-card p-5">
              <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">{row.person.displayName}</Link>
              <p className="text-bark">{witnessLine(row.person.displayName, row.role)}</p>
            </li>
          ))}
          {!event.witnesses.length ? <li className="text-bark">No witnesses recorded for this day.</li> : null}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl" data-testid="wedding-photos-heading">{weddingPhotosHeading(dayPhotos.length)}</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2" data-testid="wedding-photos">
          {dayPhotos.map((photo) => (
            <li key={photo.id} className="paper-card overflow-hidden">
              <Link href={`/archive/${photo.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${photo.storagePath}`} alt={photo.title || ""} className="aspect-video w-full object-cover" />
                <p className="p-4 font-display text-xl">{photo.title || "A photograph of that day"}</p>
              </Link>
            </li>
          ))}
          {!dayPhotos.length ? <li className="text-bark">No photographs dated to this wedding day.</li> : null}
        </ul>
      </section>
      <p className="mt-8 font-sans text-sm">
        <Link href="/weddings" className="text-seal">All weddings</Link>
        {" · "}
        <Link href="/weddings/missing" className="text-seal">Missing witnesses or photographs</Link>
      </p>
    </AppShell>
  );
}
