import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { assignedHeading } from "@/lib/cityDirectory";

export default async function AssignedPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string }>;
}) {
  const ctx = await requireFamily();
  const { personId } = await searchParams;
  const people = await prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } });
  const focusId = personId || ctx.membership.personId || people[0]?.id;
  const person = people.find((row) => row.id === focusId) ?? null;
  const [tasks, items] = person
    ? await Promise.all([
        prisma.researchTask.findMany({
          where: { familyId: ctx.family.id, assigneeId: person.id },
          include: { person: true },
          orderBy: [{ doneAt: "asc" }, { createdAt: "desc" }],
        }),
        prisma.digitizeItem.findMany({
          where: { familyId: ctx.family.id, assigneeId: person.id },
          include: { holder: true },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], []];
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="assigned-heading">
        {person ? assignedHeading(person.displayName, tasks.length + items.length) : "Assigned work"}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">Research tasks and things still to scan, given to a specific relative.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {people.map((row) => (
          <Link
            key={row.id}
            href={`/assigned?personId=${row.id}`}
            className={`rounded-full px-3 py-1 font-sans text-sm ${focusId === row.id ? "bg-seal text-cream" : "border border-bark/15"}`}
          >
            {row.displayName}
          </Link>
        ))}
      </div>
      <ul className="mt-10 space-y-3" data-testid="assigned-list">
        {tasks.map((task) => (
          <li key={task.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">Research</p>
            <Link href="/tasks" className="font-display text-2xl text-seal">{task.title}</Link>
            {task.person ? <p className="text-bark">About {task.person.displayName}</p> : null}
          </li>
        ))}
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-gold">Scan</p>
            <Link href="/digitize" className="font-display text-2xl text-seal">{item.title}</Link>
            <p className="text-bark">{item.kind}</p>
          </li>
        ))}
        {person && !tasks.length && !items.length ? <li className="text-bark">Nothing assigned yet.</li> : null}
      </ul>
    </AppShell>
  );
}
