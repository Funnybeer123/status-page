import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { livingPeople } from "@/lib/moreFamily";
import { isLivingMinor } from "@/lib/privacy";
import { canWrite } from "@/lib/roles";
import { buildAgePyramid, pyramidBandLine } from "@/lib/pyramid";

export default async function AgePyramidPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    orderBy: { displayName: "asc" },
  });
  const living = livingPeople(people).filter((person) => canWrite(ctx.role) || !isLivingMinor(person));
  const pyramid = buildAgePyramid(living);
  const max = Math.max(1, ...pyramid.bands.map((band) => band.count), pyramid.unknown.count);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="pyramid-heading">
        {pyramid.heading}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Ages of living relatives, counted the way a reunion seating chart would.{" "}
        <Link href="/living" className="text-seal">Still living</Link>.
      </p>
      <ul className="mt-10 space-y-3" data-testid="pyramid-list">
        {pyramid.bands.map((band) => (
          <li key={band.key} className="paper-card p-5">
            <p className="font-display text-2xl">{pyramidBandLine(band.label, band.count)}</p>
            <div className="mt-2 h-3 rounded-full bg-paper">
              <div
                className="h-3 rounded-full bg-seal"
                style={{ width: `${Math.round((band.count / max) * 100)}%` }}
              />
            </div>
            <p className="mt-2 font-sans text-sm text-bark">
              {band.people.map((person) => person.displayName).join(" · ")}
            </p>
          </li>
        ))}
        {pyramid.unknown.count ? (
          <li className="paper-card p-5">
            <p className="font-display text-2xl">{pyramidBandLine(pyramid.unknown.label, pyramid.unknown.count)}</p>
            <p className="mt-2 font-sans text-sm text-bark">
              {pyramid.unknown.people.map((person) => person.displayName).join(" · ")}
            </p>
          </li>
        ) : null}
      </ul>
    </AppShell>
  );
}
