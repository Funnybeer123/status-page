import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { formatDate } from "@/lib/dates";

export default async function QuiltsPage() {
  const ctx = await requireFamily();
  const [people, records] = await Promise.all([
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null }, orderBy: { displayName: "asc" } }),
    prisma.textileRecord.findMany({ where: { familyId: ctx.family.id }, include: { maker: true }, orderBy: { title: "asc" } }),
  ]);
  const options = people.map((person) => ({ id: person.id, displayName: person.displayName }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="quilts-heading">Quilts and textiles</h1>
      <p className="mt-3 max-w-2xl text-bark">
        A quilt, sampler, or lace a relative made.{" "}
        <Link href="/bees" className="text-seal">Quilting bees</Link>
      </p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="textile"
          action="/api/later-records"
          testId="quilt-form"
          submit="Add the textile"
          fields={[
            { name: "makerId", people: options, label: "Who made it" },
            { name: "title", placeholder: "Wedding ring quilt", required: true },
            { name: "textileKind", placeholder: "quilt", required: true },
            { name: "madeOn", placeholder: "Made", type: "date" },
            { name: "notes", placeholder: "Notes" },
          ]}
        />
      ) : null}
      <ul className="mt-10 space-y-3" data-testid="quilts-list">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">
              {row.kind}
              {row.maker ? (
                <>
                  {" · "}
                  <Link href={`/people/${row.maker.id}`} className="text-seal">{row.maker.displayName}</Link>
                </>
              ) : null}
              {row.madeOn ? ` · ${formatDate(row.madeOn)}` : ""}
            </p>
            {row.notes ? <p className="mt-2 text-bark">{row.notes}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No quilts or textiles yet.</li> : null}
      </ul>
    </AppShell>
  );
}
