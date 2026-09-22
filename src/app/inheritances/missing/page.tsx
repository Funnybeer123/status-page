import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingInheritanceHeading } from "@/lib/inheritances";

export default async function MissingInheritancesPage() {
  const ctx = await requireFamily();
  const [wills, items] = await Promise.all([
    prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: DocKind.will, deletedAt: null },
      orderBy: { title: "asc" },
    }),
    prisma.inheritanceItem.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  const used = new Set(items.map((item) => item.documentId).filter(Boolean));
  const missing = wills.filter((will) => !used.has(will.id));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-inheritances-heading">
        {missingInheritanceHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-inheritances-list">
        {missing.map((will) => (
          <li key={will.id} className="paper-card p-5">
            <Link href={`/letters/${will.id}`} className="font-display text-2xl text-seal">
              {will.title}
            </Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingInheritanceHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
