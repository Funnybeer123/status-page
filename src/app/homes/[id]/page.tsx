import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { HomeAddForm } from "@/app/homes/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate, formatYear } from "@/lib/dates";

export default async function HomePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [home, people, assets] = await Promise.all([
    prisma.familyHome.findFirst({
      where: { id, familyId: ctx.family.id },
      include: {
        photos: { include: { asset: true }, orderBy: { takenOn: "asc" } },
        residents: { include: { person: true } },
        place: true,
        landRecords: { include: { person: true } },
      },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.asset.findMany({ where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" }, orderBy: { title: "asc" } }),
  ]);
  if (!home) notFound();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Home</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="home-title">{home.title}</h1>
      <p className="mt-3 text-bark">{[home.line, home.locality, home.region].filter(Boolean).join(", ")}</p>
      <p className="mt-2 font-sans text-sm">
        <Link href={`/homes/${home.id}/years`} className="text-seal">Who lived here, year by year</Link>
        {" · "}
        <Link href={`/homes/${home.id}/gaps`} className="text-seal">Empty years</Link>
      </p>
      {home.notes ? <p className="mt-2 text-bark">{home.notes}</p> : null}
      {canWrite(ctx.role) ? (
        <HomeAddForm
          homeId={home.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
          assets={assets.map((asset) => ({ id: asset.id, title: asset.title }))}
        />
      ) : null}
      <section className="mt-10">
        <h2 className="font-display text-2xl">Who lived here</h2>
        <ul className="mt-4 space-y-2" data-testid="home-residents">
          {home.residents.map((row) => (
            <li key={row.personId} className="paper-card p-4">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              <span className="ml-2 font-sans text-sm text-bark">
                {formatYear(row.startedOn) || "?"}–{formatYear(row.endedOn) || ""}
              </span>
            </li>
          ))}
          {!home.residents.length ? <li className="text-bark">No residents recorded.</li> : null}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Land abstracts</h2>
        <ul className="mt-4 space-y-2" data-testid="home-abstracts">
          {home.landRecords.map((row) => (
            <li key={row.id} className="paper-card p-4">
              <p className="font-display text-xl">{row.title}</p>
              <p className="text-bark">
                <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
                {row.abstract ? ` — ${row.abstract}` : ""}
              </p>
            </li>
          ))}
          {!home.landRecords.length ? <li className="text-bark">No deed abstract tied to this house yet.</li> : null}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Photographs across the years</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2" data-testid="home-photos">
          {home.photos.map((photo) => (
            <li key={photo.id} className="paper-card overflow-hidden">
              <Link href={`/archive/${photo.assetId}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${photo.asset.storagePath}`} alt={photo.caption || photo.asset.title || ""} className="aspect-video w-full object-cover" />
                <p className="p-4 font-display text-xl">{photo.caption || photo.asset.title}</p>
                <p className="px-4 pb-4 font-sans text-sm text-gold">{formatDate(photo.takenOn, "Year unknown")}</p>
              </Link>
            </li>
          ))}
          {!home.photos.length ? <li className="text-bark">No photographs yet.</li> : null}
        </ul>
      </section>
    </AppShell>
  );
}
