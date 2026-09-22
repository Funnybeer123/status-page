import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileTrashAudit, emptyAuditHeading, trashAuditHeading } from "@/lib/trashAudit";

export default async function TrashAuditPage() {
  const ctx = await requireFamily();
  const rows = await prisma.trashAudit.findMany({
    where: { familyId: ctx.family.id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const items = compileTrashAudit(rows);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="trash-audit-heading">
        {items.length ? trashAuditHeading(items.length) : emptyAuditHeading()}
      </h1>
      <p className="mt-3 text-bark">
        Who put what in the trash, and when.{" "}
        <Link href="/trash" className="text-seal">Trash</Link>
        {" · "}
        <Link href="/trash/audit/empty" className="text-seal">Empty audit</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="trash-audit-list">
        {items.map((item) => (
          <li key={item.id} className="paper-card p-5">
            <p className="font-display text-2xl">{item.title}</p>
            <p className="text-bark">{item.line}</p>
          </li>
        ))}
        {!items.length ? <li className="text-bark">{emptyAuditHeading()}</li> : null}
      </ul>
      <CiteBlock title={trashAuditHeading(items.length)} path="/trash/audit" />
    </AppShell>
  );
}
