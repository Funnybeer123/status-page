import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { buildPedigree } from "@/lib/pedigree";
import { fanPoint, fanSlices } from "@/lib/fan";

export default async function FanPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string }>;
}) {
  const ctx = await requireFamily();
  const params = await searchParams;
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const rootId = params.personId && people.some((person) => person.id === params.personId)
    ? params.personId
    : ctx.membership.personId && people.some((person) => person.id === ctx.membership.personId)
      ? ctx.membership.personId
      : people[people.length - 1]?.id || "";
  const tree = buildPedigree(rootId, people, relationships, 4);
  const slices = fanSlices(tree);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="fan-heading">Ancestor fan</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Parents and grandparents arranged the way a paper fan chart is drawn.{" "}
        {rootId ? (
          <Link href={`/fan/print?personId=${rootId}`} className="text-seal" data-testid="fan-print-link">
            Printable fan
          </Link>
        ) : null}
      </p>
      {tree ? (
        <div className="paper-card mt-8 overflow-hidden p-4" data-testid="fan-chart">
          <svg viewBox="0 0 720 420" className="h-96 w-full bg-[#f3ead8]" role="img" aria-label="Ancestor fan">
            {slices.map((slice) => {
              const point = fanPoint(slice);
              return (
                <g key={slice.id}>
                  <circle cx={point.x} cy={point.y} r={slice.generation === 0 ? 10 : 7} className="fill-seal" />
                  <text x={point.x + 10} y={point.y + 4} className="fill-ink" fontSize="13">
                    {slice.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <p className="mt-8 text-bark">Add a person to draw a fan.</p>
      )}
      <ul className="mt-8 flex flex-wrap gap-3 font-sans text-sm">
        {people.map((person) => (
          <li key={person.id}>
            <Link href={`/fan?personId=${person.id}`} className="text-seal">{person.displayName}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
