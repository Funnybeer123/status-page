import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PairForm } from "@/app/pairs/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function PairsPage() {
  const ctx = await requireFamily();
  const [assets, pairs, places] = await Promise.all([
    prisma.asset.findMany({
      where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" },
      orderBy: { title: "asc" },
    }),
    prisma.photoPair.findMany({
      where: { familyId: ctx.family.id },
      include: { thenAsset: true, nowAsset: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.place.findMany({
      where: { familyId: ctx.family.id },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="pairs-heading">Then and now</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Two photographs of the same place or face, years apart.{" "}
        <Link href="/map/then-now" className="text-seal">Then and now on the map</Link>
      </p>
      {canWrite(ctx.role) ? (
        <PairForm
          assets={assets.map((asset) => ({ id: asset.id, title: asset.title || "Untitled" }))}
          places={places.map((place) => ({ id: place.id, name: place.name }))}
        />
      ) : null}
      <ul className="mt-10 space-y-6" data-testid="pairs-list">
        {pairs.map((pair) => (
          <li key={pair.id} className="paper-card p-5">
            <h2 className="font-display text-2xl">{pair.title}</h2>
            {pair.notes ? <p className="text-bark">{pair.notes}</p> : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${pair.thenAsset.storagePath}`} alt="Then" className="aspect-[4/3] w-full object-cover" />
                <figcaption className="mt-2 font-sans text-sm text-gold">Then · {pair.thenAsset.title}</figcaption>
              </figure>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${pair.nowAsset.storagePath}`} alt="Now" className="aspect-[4/3] w-full object-cover" />
                <figcaption className="mt-2 font-sans text-sm text-gold">Now · {pair.nowAsset.title}</figcaption>
              </figure>
            </div>
          </li>
        ))}
        {!pairs.length ? <li className="text-bark">No pairs yet.</li> : null}
      </ul>
    </AppShell>
  );
}
