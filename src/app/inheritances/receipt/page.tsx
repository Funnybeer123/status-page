import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileInheritances, inheritanceReceiptHeading } from "@/lib/inheritances";

export default async function InheritanceReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const ctx = await requireFamily();
  const { documentId } = await searchParams;
  const items = await prisma.inheritanceItem.findMany({
    where: { familyId: ctx.family.id, ...(documentId ? { documentId } : {}) },
    include: { person: true, document: true, probate: true },
  });
  const compiled = compileInheritances(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      heir: item.person.displayName,
      source: item.document?.title || item.probate?.title || null,
      notes: item.notes,
    })),
  );
  const source = compiled[0]?.source || items[0]?.document?.title || "The family wills";
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold print:hidden">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="inheritance-receipt-heading">
        {inheritanceReceiptHeading(source)}
      </h1>
      <p className="mt-3 text-bark print:hidden">
        <Link href="/inheritances" className="text-seal">Who inherited what</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="inheritance-receipt">
        {compiled.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-display text-2xl">{item.title}</p>
            <p className="text-bark">Inherited by {item.heir}</p>
          </li>
        ))}
        {!compiled.length ? <li className="text-bark">Nothing to print yet.</li> : null}
      </ul>
    </AppShell>
  );
}
