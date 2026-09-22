import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CapsuleForm } from "@/app/capsules/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function CapsulesPage() {
  const ctx = await requireFamily();
  const [people, capsules] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.timeCapsule.findMany({
      where: { familyId: ctx.family.id },
      include: { document: true, addressee: true, fromPerson: true },
      orderBy: { openOn: "asc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="capsules-heading">Time capsules</h1>
      <p className="mt-3 max-w-2xl text-bark">
        Letters addressed to a named future relative, dated for the day they should be opened. Ask can find them.
      </p>
      {canWrite(ctx.role) ? (
        <CapsuleForm people={people.map((person) => ({ id: person.id, displayName: person.displayName }))} />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="capsules-list">
        {capsules.map((capsule) => (
          <li key={capsule.id} className="paper-card p-5">
            <Link href={`/capsules/${capsule.id}`} className="font-display text-2xl text-seal">
              {capsule.document.title}
            </Link>
            <p className="mt-1 text-bark">
              For {capsule.addresseeName}
              {capsule.fromPerson ? ` · from ${capsule.fromPerson.displayName}` : ""}
            </p>
            <p className="font-sans text-sm text-gold">Open {formatDate(capsule.openOn)}</p>
          </li>
        ))}
        {!capsules.length ? <li className="text-bark">No capsules yet.</li> : null}
      </ul>
    </AppShell>
  );
}
