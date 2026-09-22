import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { bringListHeading, compileBringList } from "@/lib/reunionBring";
import { BringForm } from "@/app/ask-save/ui";

export default async function ReunionBringPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [reunion, people, assets, heirlooms] = await Promise.all([
    prisma.reunionGathering.findFirst({
      where: { id, familyId: ctx.family.id },
      include: {
        dishes: { include: { person: true } },
        brings: { include: { person: true } },
      },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.asset.findMany({ where: { familyId: ctx.family.id, deletedAt: null, kind: "photo" }, orderBy: { title: "asc" } }),
    prisma.heirloom.findMany({ where: { familyId: ctx.family.id }, orderBy: { title: "asc" } }),
  ]);
  if (!reunion) notFound();
  const items = compileBringList({
    brings: reunion.brings.map((item) => ({
      id: item.id,
      kind: item.kind as "photo" | "heirloom" | "dish",
      title: item.title,
      personName: item.person.displayName,
      notes: item.notes,
    })),
    dishes: reunion.dishes.map((dish) => ({
      id: dish.id,
      title: dish.title,
      personName: dish.person?.displayName ?? null,
      notes: dish.notes,
    })),
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Reunion bring-list</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="bring-heading">{bringListHeading(items.length)}</h1>
      <p className="mt-3 text-bark">
        For {reunion.title}.{" "}
        <Link href={`/reunions/${reunion.id}`} className="text-seal">Back to the reunion</Link>.
      </p>
      {canWrite(ctx.role) ? (
        <BringForm
          reunionId={reunion.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
          assets={assets.map((asset) => ({ id: asset.id, title: asset.title }))}
          heirlooms={heirlooms.map((item) => ({ id: item.id, title: item.title }))}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="bring-page-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold">{item.kindLabel}</p>
            <p className="font-display text-2xl">{item.title}</p>
            <p className="text-bark">{item.line}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">Nothing on the bring-list yet.</li> : null}
      </ul>
    </AppShell>
  );
}
