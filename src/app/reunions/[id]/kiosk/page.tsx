import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { loadOnThisDaySources } from "@/lib/familyDates";
import { collectOnThisDay, onThisDayHeading } from "@/lib/onThisDay";
import { kioskArrivedLine } from "@/lib/reunionCheckin";

export default async function ReunionKioskPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [reunion, sources] = await Promise.all([
    prisma.reunionGathering.findFirst({
      where: { id, familyId: ctx.family.id },
      include: {
        guests: { include: { person: true } },
        photos: { include: { asset: true } },
      },
    }),
    loadOnThisDaySources(ctx.family.id),
  ]);
  if (!reunion) notFound();
  const today = collectOnThisDay({ ...sources, role: ctx.role }).slice(0, 6);
  const coming = reunion.guests.filter((guest) => guest.coming);
  const arrived = reunion.guests.filter((guest) => guest.arrived);
  return (
    <div className="min-h-screen bg-cream px-8 py-10 text-ink" data-testid="reunion-kiosk">
      <p className="font-sans text-sm uppercase tracking-[0.28em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-4 font-display text-6xl leading-tight md:text-7xl" data-testid="kiosk-title">{reunion.title}</h1>
      <p className="mt-4 text-2xl text-bark">
        {formatDate(reunion.happenedOn)} · {reunion.place}
      </p>
      <section className="mt-12">
        <h2 className="font-display text-4xl">On this day · {onThisDayHeading()}</h2>
        <ul className="mt-6 space-y-4" data-testid="kiosk-today">
          {today.map((item) => (
            <li key={item.id} className="paper-card p-6">
              <p className="font-display text-3xl">{item.title}</p>
              <p className="mt-1 text-xl text-bark">{item.year || item.kind}</p>
            </li>
          ))}
          {!today.length ? <li className="text-2xl text-bark">Nothing in the archive falls on today yet.</li> : null}
        </ul>
      </section>
      <section className="mt-12">
        <h2 className="font-display text-4xl">Who’s here</h2>
        <p className="mt-4 text-2xl text-bark" data-testid="kiosk-coming">
          {coming.map((guest) => guest.person.displayName).join(" · ") || "No one has said they are coming."}
        </p>
        <p className="mt-4 text-2xl text-bark" data-testid="kiosk-arrived">
          {kioskArrivedLine(arrived.map((guest) => guest.person.displayName))}
        </p>
      </section>
      <section className="mt-12">
        <h2 className="font-display text-4xl">Gallery</h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2" data-testid="kiosk-gallery">
          {reunion.photos.map((photo) => (
            <li key={photo.assetId} className="paper-card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/media/${photo.asset.storagePath}`} alt={photo.asset.title || ""} className="aspect-video w-full object-cover" />
              <p className="p-6 font-display text-3xl">{photo.asset.title}</p>
            </li>
          ))}
          {!reunion.photos.length ? <li className="text-2xl text-bark">No photographs on this reunion yet.</li> : null}
        </ul>
      </section>
      <p className="mt-12 font-sans text-sm">
        <Link href={`/reunions/${reunion.id}`} className="text-seal">Back to the reunion page</Link>
      </p>
    </div>
  );
}
