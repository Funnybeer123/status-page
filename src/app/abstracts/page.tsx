import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { landAbstractLine } from "@/lib/landAbstract";
import { formatDate } from "@/lib/dates";

export default async function AbstractsPage() {
  const ctx = await requireFamily();
  const records = await prisma.landRecord.findMany({
    where: { familyId: ctx.family.id, abstract: { not: null } },
    include: { person: true, home: true },
    orderBy: { acquiredOn: "asc" },
  });
  const rows = records.filter((row) => row.abstract?.trim());
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="abstracts-heading">Land abstracts</h1>
      <p className="mt-3 max-w-2xl text-bark">Deed abstracts tied to the homes they describe.</p>
      <ul className="mt-10 space-y-3" data-testid="abstracts-list">
        {rows.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">
              <Link href={`/people/${row.personId}`} className="text-seal">{row.person.displayName}</Link>
              {row.home ? (
                <>
                  {" · "}
                  <Link href={`/homes/${row.home.id}`} className="text-seal">{row.home.title}</Link>
                </>
              ) : null}
              {row.acquiredOn ? ` · ${formatDate(row.acquiredOn)}` : ""}
            </p>
            <p className="mt-2 text-bark" data-testid="land-abstract">
              {landAbstractLine({
                title: row.title,
                place: row.place,
                homeTitle: row.home?.title,
                abstract: row.abstract,
              })}
            </p>
          </li>
        ))}
        {!rows.length ? <li className="text-bark">No abstracts yet.</li> : null}
      </ul>
    </AppShell>
  );
}
