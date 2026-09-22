import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { pickHomeMotto } from "@/lib/homeMotto";
import { tableTentHeading, tentMottoLine } from "@/lib/tableTent";

export default async function TableTentPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
  });
  if (!reunion) notFound();
  const mottos = await prisma.familyMotto.findMany({ where: { familyId: ctx.family.id } });
  const motto = pickHomeMotto(mottos);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold print:hidden">Printable table tent</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="table-tent-heading">
        {tableTentHeading(reunion.title, motto?.text)}
      </h1>
      <p className="mt-3 text-bark print:hidden">
        Fold this card so the motto faces the table.{" "}
        <Link href={`/reunions/${reunion.id}`} className="text-seal">Reunion</Link>
        {" · "}
        <Link href="/mottos" className="text-seal">Mottos</Link>
        {" · "}
        <Link href="/tents" className="text-seal">All tents</Link>
      </p>
      <article className="mx-auto mt-10 max-w-xl paper-card p-12 text-center" data-testid="table-tent">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{reunion.title}</p>
        <p className="mt-6 font-display text-5xl" data-testid="tent-motto">
          {tentMottoLine(motto?.text)}
        </p>
        <p className="mt-6 text-bark">
          {formatDate(reunion.happenedOn)} · {reunion.place}
        </p>
      </article>
      <CiteBlock title={tableTentHeading(reunion.title, motto?.text)} path={`/reunions/${reunion.id}/tent`} />
    </AppShell>
  );
}
