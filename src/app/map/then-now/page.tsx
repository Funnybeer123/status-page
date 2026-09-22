import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mapBounds, projectPoint } from "@/lib/geocode";
import { compileThenNowMap, thenNowMapHeading } from "@/lib/thenNowMap";

export default async function ThenNowMapPage({
  searchParams,
}: {
  searchParams: Promise<{ placeId?: string }>;
}) {
  const ctx = await requireFamily();
  const { placeId } = await searchParams;
  const pairs = await prisma.photoPair.findMany({
    where: {
      familyId: ctx.family.id,
      ...(placeId ? { OR: [{ placeId }, { thenAsset: { placeId } }, { nowAsset: { placeId } }] } : {}),
    },
    include: {
      thenAsset: { include: { place: true } },
      nowAsset: { include: { place: true } },
      place: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const items = compileThenNowMap(pairs);
  const bounds = mapBounds(items);
  const heading = items[0]?.heading || thenNowMapHeading();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="then-now-heading">{heading}</h1>
      <p className="mt-3 max-w-2xl text-bark">
        The same place in two years, with the photograph from each.{" "}
        <Link href="/pairs" className="text-seal">Then and now pairs</Link>
        {" · "}
        <Link href="/map" className="text-seal">The family map</Link>
        {" · "}
        <Link href="/map/then-now/missing" className="text-seal">Pairs still off the map</Link>
      </p>
      {bounds && items.length ? (
        <svg viewBox="0 0 640 360" className="mt-8 w-full rounded-2xl bg-paper" data-testid="then-now-map">
          {items.map((item) => {
            const xy = projectPoint(item, bounds, 640, 360);
            return (
              <g key={item.id}>
                <circle cx={xy.x} cy={xy.y} r="7" className="fill-seal" />
                <text x={xy.x + 10} y={xy.y + 4} className="fill-ink text-[11px]">
                  {item.placeName} · {item.years}
                </text>
              </g>
            );
          })}
        </svg>
      ) : null}
      <ul className="mt-8 space-y-4" data-testid="then-now-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{item.years}</p>
            <h2 className="font-display text-2xl">{item.title}</h2>
            <p className="text-bark">{item.placeName}</p>
            <p className="mt-2 font-sans text-sm text-gold">
              {item.thenTitle} · {item.nowTitle}
            </p>
            <p className="mt-2">
              <Link href={`/pairs`} className="text-seal">Open the pair</Link>
            </p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">No then-and-now pair sits on the map yet.</li> : null}
      </ul>
      <CiteBlock title={heading} path={placeId ? `/map/then-now?placeId=${placeId}` : "/map/then-now"} />
    </AppShell>
  );
}
