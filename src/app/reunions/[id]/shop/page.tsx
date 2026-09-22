import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { ShopItemForm } from "@/app/alive-when/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { compileShopList, shopHeading } from "@/lib/reunionShop";

export default async function ReunionShopPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { shopItems: true },
  });
  if (!reunion) notFound();
  const items = compileShopList(reunion.shopItems);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Reunion shopping list</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="shop-heading">
        {shopHeading(reunion.title, items.length)}
      </h1>
      <p className="mt-3 text-bark">
        Plates, chairs, name tags — what the hall still needs.{" "}
        <Link href={`/reunions/${reunion.id}`} className="text-seal">The reunion</Link>
        {" · "}
        <Link href="/reunions/shop/missing" className="text-seal">Reunions without a list</Link>
      </p>
      {canWrite(ctx.role) ? <ShopItemForm reunionId={reunion.id} /> : null}
      <ul className="mt-10 space-y-3" data-testid="shop-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-display text-2xl">{item.line}</p>
            {item.notes ? <p className="text-bark">{item.notes}</p> : null}
          </li>
        ))}
        {!items.length ? <li className="text-bark">Nothing on the shopping list yet.</li> : null}
      </ul>
      <CiteBlock title={shopHeading(reunion.title, items.length)} path={`/reunions/${reunion.id}/shop`} />
    </AppShell>
  );
}
