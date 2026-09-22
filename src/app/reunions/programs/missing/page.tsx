import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingProgramsHeading } from "@/lib/reunionProgram";

export default async function MissingProgramsPage() {
  const ctx = await requireFamily();
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id, programItems: { none: {} } },
    orderBy: { title: "asc" },
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-programs-heading">
        {missingProgramsHeading(reunions.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-programs-list">
        {reunions.map((reunion) => (
          <li key={reunion.id} className="paper-card p-5">
            <Link href={`/reunions/${reunion.id}/program`} className="font-display text-2xl text-seal">
              {reunion.title}
            </Link>
          </li>
        ))}
        {!reunions.length ? <li className="text-bark">{missingProgramsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
