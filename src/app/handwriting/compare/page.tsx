import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compareHeading, compareHref } from "@/lib/handwritingCompare";

export default async function HandwritingComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const ctx = await requireFamily();
  const { a, b } = await searchParams;
  const samples = await prisma.handwritingSample.findMany({
    where: { familyId: ctx.family.id },
    include: { person: true, document: true, asset: true },
    orderBy: { person: { displayName: "asc" } },
  });
  const left = samples.find((sample) => sample.id === a) ?? samples[0];
  const right =
    samples.find((sample) => sample.id === b && sample.id !== left?.id) ??
    samples.find((sample) => sample.id !== left?.id);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="handwriting-compare-heading">
        {compareHeading(left?.person.displayName, right?.person.displayName)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Two samples side by side — the loops, the slope, the way they wrote a name.</p>
      <form className="mt-6 flex flex-wrap gap-3 font-sans text-sm" action="/handwriting/compare">
        <select name="a" defaultValue={left?.id} className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          {samples.map((sample) => (
            <option key={sample.id} value={sample.id}>{sample.person.displayName}</option>
          ))}
        </select>
        <select name="b" defaultValue={right?.id} className="rounded-lg border border-bark/15 bg-paper px-3 py-2">
          {samples.map((sample) => (
            <option key={sample.id} value={sample.id}>{sample.person.displayName}</option>
          ))}
        </select>
        <button className="rounded-full bg-seal px-4 py-2 text-cream" type="submit">Compare</button>
      </form>
      <div className="mt-10 grid gap-6 md:grid-cols-2" data-testid="handwriting-compare">
        {[left, right].filter(Boolean).map((sample) => (
          <article key={sample!.id} className="paper-card p-5">
            <Link href={`/people/${sample!.personId}`} className="font-display text-2xl text-seal">
              {sample!.person.displayName}
            </Link>
            {sample!.document ? (
              <p className="mt-2">
                <Link href={`/letters/${sample!.document.id}`} className="text-seal">{sample!.document.title}</Link>
              </p>
            ) : null}
            {sample!.notes ? <p className="mt-3 text-bark">{sample!.notes}</p> : null}
            {sample!.asset?.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/media/${sample!.asset.storagePath}`} alt="" className="mt-4 w-full" />
            ) : null}
          </article>
        ))}
        {!left ? <p className="text-bark">Save two handwriting samples to compare them.</p> : null}
      </div>
      <p className="mt-8 font-sans text-sm">
        <Link href="/handwriting" className="text-seal">All handwriting</Link>
        {left && right ? (
          <>
            {" · "}
            <Link href={compareHref(left.id, right.id)} className="text-seal">This pair</Link>
          </>
        ) : null}
      </p>
    </AppShell>
  );
}
