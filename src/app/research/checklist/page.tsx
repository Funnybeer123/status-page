import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { checklistHeading, checklistItemLine, usualDocumentTypes } from "@/lib/researchChecklist";
import { ChecklistToggle } from "@/app/hunt/ui";

export default async function ResearchChecklistPage() {
  const ctx = await requireFamily();
  let items = await prisma.researchChecklistItem.findMany({
    where: { familyId: ctx.family.id },
    orderBy: { createdAt: "asc" },
  });
  if (!items.length) {
    await prisma.researchChecklistItem.createMany({
      data: usualDocumentTypes().map((item) => ({
        familyId: ctx.family.id,
        kind: item.kind,
        title: item.title,
      })),
    });
    items = await prisma.researchChecklistItem.findMany({
      where: { familyId: ctx.family.id },
      orderBy: { createdAt: "asc" },
    });
  }
  const done = items.filter((item) => item.doneAt).length;
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="research-checklist-heading">
        {checklistHeading(done, items.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">The usual document types are already listed.</p>
      <ul className="mt-10 space-y-3" data-testid="research-checklist">
        {items.map((item) => (
          <li key={item.id} className="paper-card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold">{item.kind}</p>
              <p className="font-display text-2xl">{item.title}</p>
              <p className="text-bark">{checklistItemLine(item.title, Boolean(item.doneAt))}</p>
            </div>
            {canWrite(ctx.role) ? <ChecklistToggle kind={item.kind} done={Boolean(item.doneAt)} /> : null}
          </li>
        ))}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/research" className="text-seal">Still to ask</Link>
      </p>
    </AppShell>
  );
}
