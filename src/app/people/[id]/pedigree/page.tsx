import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { compileDrawnPedigree } from "@/lib/drawnPedigree";

export default async function DrawnPedigreePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [person, people, relationships] = await Promise.all([
    prisma.person.findFirst({ where: { id, familyId: ctx.family.id, deletedAt: null } }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  if (!person || hideMinorDetails(ctx.role, person)) notFound();
  const visible = people.filter((row) => !hideMinorDetails(ctx.role, row));
  const pedigree = compileDrawnPedigree(person.id, visible, relationships);
  return (
    <main className="mx-auto max-w-5xl px-8 py-12">
      <div className="print:hidden">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
        <h1 className="mt-2 font-display text-5xl" data-testid="drawn-pedigree-heading">{pedigree.heading}</h1>
        <p className="mt-3 text-bark">
          Wavy ink for a wall. Print this page.{" "}
          <Link href="/pedigree" className="text-seal">All pedigrees</Link>
          {" · "}
          <Link href="/tree/poster" className="text-seal">Generation poster</Link>
        </p>
      </div>
      <article className="mt-10" data-testid="drawn-pedigree-poster">
        <div dangerouslySetInnerHTML={{ __html: pedigree.svg }} />
      </article>
    </main>
  );
}
