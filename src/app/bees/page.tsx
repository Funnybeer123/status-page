import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { BeeBlockForm, BeeForm } from "@/app/quilting/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileBeeBlocks, compileBees, quiltingBeeHeading, quiltingBeesHeading, quiltingBlockLine } from "@/lib/quiltingBee";

export default async function BeesPage() {
  const ctx = await requireFamily();
  const [bees, people] = await Promise.all([
    prisma.quiltingBee.findMany({
      where: { familyId: ctx.family.id },
      include: { blocks: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
  ]);
  const compiled = compileBees(bees);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="bees-heading">
        {quiltingBeesHeading(compiled.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Who came to the quilting bee, and which block they stitched.{" "}
        <Link href="/quilts" className="text-seal">Quilts and textiles</Link>
        {" · "}
        <Link href="/bees/missing" className="text-seal">Bees still needing a block</Link>
        {" · "}
        <Link href="/husking" className="text-seal">Husking bees</Link>
        {" · "}
        <Link href="/shelling" className="text-seal">Corn-shelling bees</Link>
      </p>
      {canWrite(ctx.role) ? (
        <>
          <BeeForm />
          <BeeBlockForm
            people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
            bees={compiled.map((bee) => ({ id: bee.id, title: bee.title }))}
          />
        </>
      ) : null}
      <ul className="mt-10 space-y-6" data-testid="bees-list">
        {compiled.map((bee) => {
          const blocks = compileBeeBlocks(
            bee.blocks.map((row) => ({
              id: row.id,
              person: row.person.displayName,
              personId: row.personId,
              block: row.block,
            })),
          );
          return (
            <li key={bee.id} className="paper-card p-8">
              <Link href={`/bees/${bee.id}`} className="font-display text-3xl text-seal">
                {quiltingBeeHeading(bee.title, blocks.length)}
              </Link>
              <ol className="mt-4 space-y-2" data-testid="bee-blocks">
                {blocks.map((row) => (
                  <li key={row.id} className="text-bark">{quiltingBlockLine(row.person, row.block)}</li>
                ))}
              </ol>
            </li>
          );
        })}
        {!compiled.length ? <li className="text-bark">{quiltingBeesHeading(0)}</li> : null}
      </ul>
      <CiteBlock title={quiltingBeesHeading(compiled.length)} path="/bees" />
    </AppShell>
  );
}
