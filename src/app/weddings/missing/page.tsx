import Link from "next/link";
import { EventKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingWeddingPhotosHeading, missingWitnessesHeading, sameCalendarDay } from "@/lib/weddingParty";

export default async function MissingWeddingsPage() {
  const ctx = await requireFamily();
  const [weddings, photos] = await Promise.all([
    prisma.lifeEvent.findMany({
      where: { familyId: ctx.family.id, kind: EventKind.marriage },
      include: { person: true, otherPerson: true, witnesses: true },
      orderBy: { happenedOn: "asc" },
    }),
    prisma.asset.findMany({ where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" } }),
  ]);
  const missingWitnesses = weddings.filter((event) => !event.witnesses.length);
  const missingPhotos = weddings.filter(
    (event) => !photos.some((photo) => sameCalendarDay(photo.capturedAt, event.happenedOn)),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-witnesses-heading">{missingWitnessesHeading(missingWitnesses.length)}</h1>
      <ul className="mt-6 space-y-3">
        {missingWitnesses.map((event) => (
          <li key={event.id} className="paper-card p-5">
            <Link href={`/weddings/${event.id}`} className="font-display text-2xl text-seal">{event.title}</Link>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 font-display text-3xl" data-testid="missing-wedding-photos-heading">{missingWeddingPhotosHeading(missingPhotos.length)}</h2>
      <ul className="mt-6 space-y-3">
        {missingPhotos.map((event) => (
          <li key={event.id} className="paper-card p-5">
            <Link href={`/weddings/${event.id}`} className="font-display text-2xl text-seal">{event.title}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
