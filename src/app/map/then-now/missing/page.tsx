import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileThenNowMap, missingThenNowHeading } from "@/lib/thenNowMap";

export default async function MissingThenNowPage() {
  const ctx = await requireFamily();
  const pairs = await prisma.photoPair.findMany({
    where: { familyId: ctx.family.id },
    include: {
      thenAsset: { include: { place: true } },
      nowAsset: { include: { place: true } },
      place: true,
    },
  });
  const mapped = new Set(compileThenNowMap(pairs).map((item) => item.id));
  const missing = pairs.filter((pair) => !mapped.has(pair.id));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-then-now-heading">
        {missingThenNowHeading(missing.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="missing-then-now">
        {missing.map((pair) => (
          <li key={pair.id} className="paper-card p-4">
            <Link href="/pairs" className="font-display text-xl text-seal">{pair.title}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingThenNowHeading(0)}</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/map/then-now" className="text-seal">Then and now on the map</Link>
      </p>
    </AppShell>
  );
}
