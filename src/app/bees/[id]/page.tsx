import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BeeBlockForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileBeeBlocks, quiltingBeeHeading, quiltingBlockLine } from "@/lib/quiltingBee";

export default async function BeePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [bee, people] = await Promise.all([
    prisma.quiltingBee.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { blocks: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  if (!bee) notFound();
  const blocks = compileBeeBlocks(
    bee.blocks.map((row) => ({
      id: row.id,
      person: row.person.displayName,
      personId: row.personId,
      block: row.block,
    })),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Quilting bee</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="bee-heading">
        {quiltingBeeHeading(bee.title, blocks.length)}
      </h1>
      {bee.place ? <p className="mt-3 text-bark">{bee.place}</p> : null}
      {canWrite(ctx.role) ? (
        <BeeBlockForm
          beeId={bee.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="bee-blocks">
        {blocks.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.personId}`} className="font-display text-2xl text-seal">
              {quiltingBlockLine(row.person, row.block)}
            </Link>
          </li>
        ))}
        {!blocks.length ? <li className="text-bark">{quiltingBeeHeading(bee.title, 0)}</li> : null}
      </ol>
      <p className="mt-8 font-sans text-sm">
        <Link href="/bees" className="text-seal">All quilting bees</Link>
      </p>
    </AppShell>
  );
}
