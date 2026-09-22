import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function PersonHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({ where: { id, familyId: ctx.family.id, deletedAt: null } });
  if (!person) notFound();
  const changes = await prisma.personChange.findMany({
    where: { familyId: ctx.family.id, personId: id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Edit history</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="history-heading">{person.displayName}</h1>
      <p className="mt-3 max-w-2xl text-bark">Who changed a date, a name, or a relationship, and when.</p>
      <p className="mt-4 font-sans text-sm">
        <Link href={`/people/${person.id}`} className="text-seal">Back to {person.displayName}</Link>
      </p>
      <ol className="mt-10 space-y-3" data-testid="history-list">
        {changes.map((change) => (
          <li key={change.id} className="paper-card p-5">
            <p className="font-sans text-sm text-gold">
              {change.actor.name} · {formatDate(change.createdAt)}
            </p>
            <p className="mt-2 font-display text-2xl">{change.field}</p>
            <p className="text-bark">
              {change.before || "blank"} → {change.after || "blank"}
            </p>
          </li>
        ))}
        {!changes.length ? <li className="text-bark">No edits recorded yet.</li> : null}
      </ol>
    </AppShell>
  );
}
