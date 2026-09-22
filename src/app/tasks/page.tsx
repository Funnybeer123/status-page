import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TaskDone, TaskForm } from "@/app/tasks/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";

export default async function TasksPage() {
  const ctx = await requireFamily();
  const [people, tasks] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id }, orderBy: { displayName: "asc" } }),
    prisma.researchTask.findMany({
      where: { familyId: ctx.family.id },
      include: { person: true, asset: true },
      orderBy: [{ doneAt: "asc" }, { createdAt: "desc" }],
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="tasks-heading">Research tasks</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Things still to ask a relative. The automatic gaps stay on{" "}
        <Link href="/research" className="text-seal">Still to ask</Link>.
      </p>
      {canWrite(ctx.role) ? (
        <TaskForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="tasks-list">
        {tasks.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className={`font-display text-2xl ${item.doneAt ? "text-bark line-through" : ""}`}>{item.title}</p>
            {item.person ? (
              <Link href={`/people/${item.person.id}`} className="font-sans text-sm text-seal">{item.person.displayName}</Link>
            ) : null}
            <p className="text-bark">{item.body}</p>
            {item.asset ? (
              <p className="mt-2 font-sans text-sm">
                <Link href={`/archive/${item.asset.id}`} className="text-seal" data-testid="task-attachment">
                  Attached file · {item.asset.title}
                </Link>
              </p>
            ) : null}
            {canWrite(ctx.role) ? <TaskDone id={item.id} done={Boolean(item.doneAt)} /> : null}
          </li>
        ))}
        {!tasks.length ? <li className="text-bark">No research tasks yet.</li> : null}
      </ul>
    </AppShell>
  );
}
