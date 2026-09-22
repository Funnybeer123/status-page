import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { classHeading } from "@/lib/cityDirectory";

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const row = await prisma.schoolClass.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { pupils: { include: { person: true } } },
  });
  if (!row) notFound();
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{row.place || "School"}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="class-heading">{classHeading(row.school, row.year)}</h1>
      {row.notes ? <p className="mt-3 text-bark">{row.notes}</p> : null}
      <ul className="mt-10 space-y-3" data-testid="class-pupils">
        {row.pupils
          .slice()
          .sort((a, b) => a.person.displayName.localeCompare(b.person.displayName))
          .map((pupil) => (
            <li key={pupil.personId} className="paper-card p-5">
              <Link href={`/people/${pupil.personId}`} className="font-display text-2xl text-seal">{pupil.person.displayName}</Link>
            </li>
          ))}
        {!row.pupils.length ? <li className="text-bark">No pupils recorded.</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href="/classes" className="text-seal">All class lists</Link>
        {" · "}
        <Link href="/schools" className="text-seal">Schools</Link>
      </p>
    </AppShell>
  );
}
