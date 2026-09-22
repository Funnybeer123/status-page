import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { compileLetterInventory } from "@/lib/letterInventory";

export default async function InventoryPage() {
  const ctx = await requireFamily();
  const letters = await prisma.document.findMany({
    where: { familyId: ctx.family.id, deletedAt: null, kind: { in: ["letter", "note"] } },
    include: { replies: true, asset: true },
    orderBy: { writtenAt: "asc" },
  });
  const rows = compileLetterInventory(letters);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="inventory-heading">Letter inventory</h1>
      <p className="mt-3 max-w-2xl text-bark">Which letters have a scan, a reply, or still need both.</p>
      <ul className="mt-10 space-y-3" data-testid="inventory-list">
        {rows.map((row) => {
          const letter = letters.find((item) => item.id === row.id);
          return (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/letters/${row.id}/room`} className="font-display text-2xl text-seal">{row.title}</Link>
            <p className="font-sans text-sm text-gold">{formatDate(letter?.writtenAt, "Undated")}</p>
            <p className="mt-2 text-bark">{row.status}</p>
          </li>
          );
        })}
        {!letters.length ? <li className="text-bark">No letters yet.</li> : null}
      </ul>
    </AppShell>
  );
}
