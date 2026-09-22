import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { placePinLine, placePinsHeading, pinHref } from "@/lib/placePin";
import { PlacePinForm } from "@/app/hunt/ui";

export default async function MapPinsPage() {
  const ctx = await requireFamily();
  const [pins, places, letters, stories] = await Promise.all([
    prisma.placePin.findMany({
      where: { familyId: ctx.family.id },
      include: { place: true, document: true, story: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.place.findMany({ where: { familyId: ctx.family.id }, orderBy: { name: "asc" } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.story.findMany({
      where: { familyId: ctx.family.id },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="place-pins-heading">{placePinsHeading(pins.length)}</h1>
      <p className="mt-3 max-w-2xl text-bark">A letter or a story pinned to one place on the map.</p>
      {canWrite(ctx.role) ? (
        <PlacePinForm
          places={places.map((place) => ({ id: place.id, name: place.name }))}
          letters={letters}
          stories={stories}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="place-pins-list">
        {pins.map((pin) => (
          <li key={pin.id} className="paper-card p-5">
            <Link href={pinHref(pin)} className="font-display text-2xl text-seal">{pin.title}</Link>
            <p className="text-bark">{placePinLine(pin.title, pin.place.name)}</p>
            <Link href={`/places/${pin.placeId}`} className="font-sans text-sm text-seal">{pin.place.name}</Link>
          </li>
        ))}
        {!pins.length ? <li className="text-bark">Pin a letter to the Grange or a story to the north farm.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/map" className="text-seal">Family map</Link>
        {" · "}
        <Link href="/letters/unpinned" className="text-seal">Letters not yet pinned</Link>
      </p>
    </AppShell>
  );
}
