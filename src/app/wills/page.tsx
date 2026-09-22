import Link from "next/link";
import { DocKind } from "@prisma/client";
import { AppShell } from "@/components/AppShell";
import { WillForm } from "@/app/wills/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { canWrite } from "@/lib/roles";

export default async function WillsPage() {
  const ctx = await requireFamily();
  const [people, wills] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
    prisma.document.findMany({
      where: { familyId: ctx.family.id, kind: DocKind.will },
      include: { people: { include: { person: true } } },
      orderBy: { writtenAt: "desc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="wills-heading">Wills</h1>
      <p className="mt-3 max-w-2xl text-bark">What someone left in writing, and who they named.</p>
      {canWrite(ctx.role) ? (
        <WillForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="wills-list">
        {wills.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <Link href={`/letters/${item.id}`} className="font-display text-2xl text-seal">{item.title}</Link>
            <p className="font-sans text-sm text-bark">
              {formatDate(item.writtenAt, "Undated")}
              {item.people.length ? ` · ${item.people.map((link) => link.person.displayName).join(", ")}` : ""}
            </p>
            <p className="mt-2 line-clamp-3 text-bark">{item.transcript}</p>
          </li>
        ))}
        {!wills.length ? <li className="text-bark">No wills yet.</li> : null}
      </ul>
    </AppShell>
  );
}
