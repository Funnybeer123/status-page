import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compilePostmarkMap, missingPostmarkMapHeading } from "@/lib/postmarkMap";

export default async function MissingPostmarkMapPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    include: { asset: { include: { place: true } } },
  });
  const { missing } = compilePostmarkMap(
    letters.map((letter) => ({
      ...letter,
      place: letter.asset?.place || null,
    })),
  );
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-postmark-map-heading">
        {missingPostmarkMapHeading(missing.length)}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/map/postmarks" className="text-seal">Postmark map</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="missing-postmark-map-list">
        {missing.map((letter) => (
          <li key={letter.id} className="paper-card p-5">
            <Link href={`/letters/${letter.id}`} className="font-display text-2xl text-seal">
              {letter.title}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingPostmarkMapHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
