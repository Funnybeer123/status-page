import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { programHeading, programsHeading } from "@/lib/reunionProgram";

export default async function ProgramsPage() {
  const ctx = await requireFamily();
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id, programItems: { some: {} } },
    include: { programItems: true },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="programs-heading">
        {programsHeading(reunions.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        <Link href="/reunions/programs/missing" className="text-seal">Reunions without a program</Link>
        {" · "}
        <Link href="/recitals" className="text-seal">Christmas programs</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="programs-list">
        {reunions.map((reunion) => (
          <li key={reunion.id} className="paper-card p-5">
            <Link href={`/reunions/${reunion.id}/program`} className="font-display text-2xl text-seal">
              {programHeading(reunion.title, reunion.programItems.length)}
            </Link>
          </li>
        ))}
        {!reunions.length ? <li className="text-bark">{programsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
