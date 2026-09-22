import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function LoansPage() {
  const ctx = await requireFamily();
  const [people, heirlooms, loans] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.heirloom.findMany({ where: { familyId: ctx.family.id }, orderBy: { title: "asc" } }),
    prisma.heirloomLoan.findMany({
      where: { familyId: ctx.family.id },
      include: { heirloom: true, borrower: true },
      orderBy: { borrowedOn: "desc" },
    }),
  ]);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="loans-heading">Heirloom loans</h1>
      <p className="mt-3 max-w-2xl text-bark">Who borrowed an item, and when it is due back.</p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="loan"
          action="/api/loans"
          testId="loan-form"
          submit="Record the loan"
          fields={[
            { name: "heirloomId", options: heirlooms.map((item) => ({ id: item.id, label: item.title })), label: "Which heirloom" },
            { name: "borrowerId", people: people.map((person) => ({ id: person.id, displayName: person.displayName })), label: "Who borrowed it", required: true },
            { name: "borrowedOn", placeholder: "Borrowed", type: "date", required: true },
            { name: "dueOn", placeholder: "Due back", type: "date" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="loans-list">
        {loans.map((loan) => (
          <li key={loan.id} className="paper-card p-5">
            <p className="font-display text-2xl">{loan.heirloom.title}</p>
            <p className="text-bark">
              <Link href={`/people/${loan.borrowerId}`} className="text-seal">{loan.borrower.displayName}</Link>
              {` borrowed it ${formatDate(loan.borrowedOn)}`}
              {loan.dueOn ? ` · due ${formatDate(loan.dueOn)}` : ""}
              {loan.returnedOn ? ` · back ${formatDate(loan.returnedOn)}` : ""}
            </p>
            {loan.notes ? <p className="mt-2 text-bark">{loan.notes}</p> : null}
          </li>
        ))}
        {!loans.length ? <li className="text-bark">Nothing is out on loan.</li> : null}
      </ul>
      <p className="mt-6 font-sans text-sm"><Link href="/heirlooms" className="text-seal">All heirlooms</Link></p>
    </AppShell>
  );
}
