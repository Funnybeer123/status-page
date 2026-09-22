import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingBringHeading } from "@/lib/reunionBring";

export default async function MissingBringPage() {
  const ctx = await requireFamily();
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id },
    include: { brings: true, dishes: true },
    orderBy: { happenedOn: "desc" },
  });
  const missing = reunions.filter((row) => !row.brings.length && !row.dishes.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-bring-heading">
        {missingBringHeading(missing.length)}
      </h1>
      <ul className="mt-10 space-y-3">
        {missing.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/reunions/${row.id}/bring`} className="font-display text-2xl text-seal">{row.title}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">Every reunion has a bring-list.</li> : null}
      </ul>
    </AppShell>
  );
}
