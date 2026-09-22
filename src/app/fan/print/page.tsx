import Link from "next/link";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { buildPedigree } from "@/lib/pedigree";
import { fanPoint, fanSlices } from "@/lib/fan";

export default async function FanPrintPage({
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
  const root = people.find((person) => person.id === rootId);
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="print:hidden">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
        <h1 className="mt-2 font-display text-4xl" data-testid="fan-print-heading">Printable ancestor fan</h1>
        <p className="mt-3 text-bark">
          <Link href={`/fan?personId=${rootId}`} className="text-seal">Back to the fan</Link>
        </p>
      </div>
      <article className="mt-8" data-testid="fan-print">
        <h2 className="font-display text-3xl">{root?.displayName || "Ancestor fan"}</h2>
        {tree ? (
          <svg viewBox="0 0 720 420" className="mt-6 h-[28rem] w-full bg-[#f3ead8]" role="img" aria-label="Printable ancestor fan">
            {slices.map((slice) => {
              const point = fanPoint(slice);
              return (
                <g key={`${slice.id}-${slice.generation}`}>
                  <circle cx={point.x} cy={point.y} r={slice.generation === 0 ? 10 : 7} className="fill-seal" />
                  <text x={point.x + 10} y={point.y + 4} className="fill-ink" fontSize="13">
                    {slice.name}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="mt-6 text-bark">Add a person to print a fan.</p>
        )}
      </article>
    </main>
  );
}
