import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideEventFromViewer } from "@/lib/privacy";
import { compileScrapbook, undatedFirstsHeading } from "@/lib/scrapbook";

export default async function UndatedFirstsPage() {
  const ctx = await requireFamily();
  const events = await prisma.lifeEvent.findMany({
    where: { familyId: ctx.family.id, firstTag: { not: null }, happenedOn: null },
    include: { person: true },
  });
  const items = compileScrapbook(events.filter((event) => !hideEventFromViewer(ctx.role, event)));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="undated-firsts-heading">{undatedFirstsHeading(items.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="undated-firsts">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="text-seal">{item.title}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
