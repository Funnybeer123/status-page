import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingShopHeading } from "@/lib/reunionShop";

export default async function MissingShopPage() {
  const ctx = await requireFamily();
  const reunions = (await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id },
    include: { shopItems: true },
    orderBy: { happenedOn: "asc" },
  })).filter((reunion) => !reunion.shopItems.length);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-shop-heading">
        {missingShopHeading(reunions.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-shop-list">
        {reunions.map((reunion) => (
          <li key={reunion.id} className="paper-card p-5">
            <Link href={`/reunions/${reunion.id}/shop`} className="font-display text-2xl text-seal">
              {reunion.title}
            </Link>
          </li>
        ))}
        {!reunions.length ? <li className="text-bark">{missingShopHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
