import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { compileMemoryLane, memoryLaneHeading, missingLanePhotoHeading } from "@/lib/memoryLane";

export default async function MemoryLanePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({
    where: { id, familyId: ctx.family.id, deletedAt: null },
  });
  if (!person) notFound();
  const hidden = hideResidenceForViewer(ctx.role, person);
  const residences = hidden
    ? []
    : await prisma.residence.findMany({
        where: { familyId: ctx.family.id, personId: person.id },
        include: { place: { include: { photos: { where: { deletedAt: null }, orderBy: { capturedAt: "asc" } } } } },
      });
  const personPhotos = hidden
    ? []
    : await prisma.asset.findMany({
        where: { familyId: ctx.family.id, deletedAt: null, tags: { some: { personId: person.id } }, placeId: { not: null } },
      });
  const items = compileMemoryLane(residences, personPhotos);
  const heading = memoryLaneHeading(person.displayName);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="memory-lane-heading">
        {heading}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Places in the order {person.displayName} lived there, with one photograph at each stop.{" "}
        <Link href={`/people/${person.id}`} className="text-seal">
          Back to {person.displayName}
        </Link>
        {" · "}
        <Link href="/lanes" className="text-seal">
          Every memory lane
        </Link>
        {" · "}
        <Link href="/lanes/missing" className="text-seal">
          Who still needs a walk
        </Link>
      </p>
      <ol className="mt-10 space-y-6" data-testid="memory-lane-list">
        {items.map((stop) => (
          <li key={stop.id} className="paper-card p-5" data-testid="memory-lane-stop">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Stop {stop.stop}</p>
            <h2 className="font-display text-2xl">{stop.line}</h2>
            {stop.notes ? <p className="mt-2 text-bark">{stop.notes}</p> : null}
            {stop.photoPath ? (
              <figure className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${stop.photoPath}`} alt={stop.photoTitle || stop.placeName} className="w-full rounded-xl" />
                <figcaption className="mt-2 font-sans text-sm text-gold">{stop.photoTitle || stop.placeName}</figcaption>
              </figure>
            ) : (
              <p className="mt-3 text-bark">{missingLanePhotoHeading(1)}</p>
            )}
            <p className="mt-3 font-sans text-sm">
              <Link href={stop.href} className="text-seal">
                Open {stop.placeName}
              </Link>
            </p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">No places are on this walk yet.</li> : null}
      </ol>
      <CiteBlock title={heading} path={`/people/${person.id}/lane`} />
    </AppShell>
  );
}
