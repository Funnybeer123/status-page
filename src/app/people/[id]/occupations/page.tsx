import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RecordForm } from "@/app/records/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { canWrite } from "@/lib/roles";
import { occupationLine, occupationTimelineHeading, sortOccupations } from "@/lib/occupations";

export default async function PersonOccupationsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const person = await prisma.person.findFirst({ where: { id, familyId: ctx.family.id, ...alive } });
  if (!person) notFound();
  const records = sortOccupations(
    await prisma.occupationRecord.findMany({ where: { familyId: ctx.family.id, personId: person.id } }),
  );
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{ctx.family.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="occupation-timeline-heading">
        {occupationTimelineHeading(person.displayName, records.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Work {person.displayName} did, in order.{" "}
        <Link href={`/people/${person.id}`} className="text-seal">Back to the record</Link>
        {" · "}
        <Link href="/occupations" className="text-seal">All occupations</Link>.
      </p>
      {canWrite(ctx.role) ? (
        <RecordForm
          kind="occupation"
          testId="occupation-timeline-form"
          submit="Add the occupation"
          fields={[
            { name: "personId", people: [{ id: person.id, displayName: person.displayName }], label: "Who worked", required: true },
            { name: "title", placeholder: "Beekeeper", required: true },
            { name: "employer", placeholder: "Employer" },
            { name: "place", placeholder: "Place" },
            { name: "startedOn", placeholder: "Started", type: "date" },
            { name: "endedOn", placeholder: "Ended", type: "date" },
          ]}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="occupation-timeline">
        {records.map((row) => (
          <li key={row.id} className="paper-card p-5">
            <p className="font-display text-2xl">{row.title}</p>
            <p className="text-bark">{occupationLine(row.title, row.employer, row.startedOn, row.endedOn)}</p>
            {row.place ? <p className="font-sans text-sm text-gold">{row.place}</p> : null}
          </li>
        ))}
        {!records.length ? <li className="text-bark">No occupations recorded yet.</li> : null}
      </ol>
    </AppShell>
  );
}
