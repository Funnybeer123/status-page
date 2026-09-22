import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { mapBounds, projectPoint } from "@/lib/geocode";
import { compilePostmarkMap, postmarkMapHeading } from "@/lib/postmarkMap";

export default async function PostmarkMapPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    include: { asset: { include: { place: true } } },
    orderBy: { writtenAt: "asc" },
  });
  const { placed } = compilePostmarkMap(
    letters.map((letter) => ({
      ...letter,
      place: letter.asset?.place || null,
    })),
  );
  const bounds = mapBounds(placed);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="postmark-map-heading">
        {postmarkMapHeading(placed.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Where letters were mailed from, using the postmark.{" "}
        <Link href="/letters/postmarks" className="text-seal">Postmarks</Link>
        {" · "}
        <Link href="/map" className="text-seal">The family map</Link>
        {" · "}
        <Link href="/map/postmarks/missing" className="text-seal">Postmarks still off the map</Link>
        {" · "}
        <Link href="/letters/postmarks/towns" className="text-seal">Towns</Link>
      </p>
      {bounds && placed.length ? (
        <svg viewBox="0 0 640 360" className="mt-8 w-full rounded-2xl bg-paper" data-testid="postmark-map">
          {placed.map((item) => {
            const xy = projectPoint(item, bounds, 640, 360);
            return (
              <g key={item.id}>
                <circle cx={xy.x} cy={xy.y} r="7" className="fill-seal" />
                <text x={xy.x + 10} y={xy.y + 4} className="fill-ink text-[11px]">
                  {item.title}
                </text>
              </g>
            );
          })}
        </svg>
      ) : null}
      <ul className="mt-8 space-y-3" data-testid="postmark-map-list">
        {placed.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={item.href} className="font-display text-2xl text-seal">
              {item.title}
            </Link>
            <p className="text-bark">{item.line}</p>
          </li>
        ))}
        {!placed.length ? <li className="text-bark">{postmarkMapHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={postmarkMapHeading(placed.length)} path="/map/postmarks" />
    </AppShell>
  );
}
