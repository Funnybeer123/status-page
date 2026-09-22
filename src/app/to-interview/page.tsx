import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileInterviewList } from "@/lib/toInterview";

export default async function ToInterviewPage() {
  const ctx = await requireFamily();
  const [people, answers] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.interviewAnswer.findMany({ where: { familyId: ctx.family.id }, select: { personId: true } }),
  ]);
  const rows = compileInterviewList(people, answers.map((item) => item.personId));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="to-interview-heading">Who to interview</h1>
      <p className="mt-3 max-w-2xl text-bark">Living relatives who have not yet answered the elder questions.</p>
      <ul className="mt-10 space-y-3" data-testid="to-interview-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/people/${row.id}`} className="font-display text-2xl text-seal">{row.name}</Link>
            <p className="text-bark">{row.reason}</p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">Everyone living has been asked, or no one is living on the tree.</li> : null}
      </ul>
      <p className="mt-6 font-sans text-sm"><Link href="/interviews" className="text-seal">Interview checklist</Link></p>
    </AppShell>
  );
}
