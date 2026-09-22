import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { classHeading } from "@/lib/cityDirectory";
import { missingTeachersHeading } from "@/lib/schoolteacher";

export default async function MissingTeachersPage() {
  const ctx = await requireFamily();
  const classes = await prisma.schoolClass.findMany({
    where: { familyId: ctx.family.id, teacherId: null },
    orderBy: [{ year: "desc" }, { school: "asc" }],
  });
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="missing-teachers-heading">
        {missingTeachersHeading(classes.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-teachers-list">
        {classes.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <Link href={`/classes/${row.id}`} className="font-display text-2xl text-seal">
              {classHeading(row.school, row.year)}
            </Link>
          </li>
        ))}
        {!classes.length ? <li className="text-bark">{missingTeachersHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
