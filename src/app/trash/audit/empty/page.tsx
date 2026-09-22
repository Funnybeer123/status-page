import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { emptyAuditHeading } from "@/lib/trashAudit";

export default async function EmptyAuditPage() {
  await requireFamily();
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-audit-heading">
        {emptyAuditHeading()}
      </h1>
      <p className="mt-3 text-bark">
        <Link href="/trash/audit" className="text-seal">Trash audit</Link>
      </p>
    </AppShell>
  );
}
