import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { HoldForm } from "@/app/box/ui";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { formatDate } from "@/lib/dates";
import { holdLine, provenanceHeading, sortHolds } from "@/lib/provenance";
import { canWrite } from "@/lib/roles";

export default async function HeirloomProvenancePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [heirloom, people] = await Promise.all([
    prisma.heirloom.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { person: true, holds: { include: { person: true } } },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, ...alive }, orderBy: { displayName: "asc" } }),
  ]);
  if (!heirloom) notFound();
  const holds = sortHolds(heirloom.holds);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Heirloom</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="provenance-heading">
        {provenanceHeading(heirloom.title, holds.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        {heirloom.summary || "The chain of who held this, in order."}{" "}
        <Link href="/heirlooms" className="text-seal">Back to heirlooms</Link>.
      </p>
      {heirloom.person ? (
        <p className="mt-2 font-sans text-sm text-bark">
          With <Link href={`/people/${heirloom.person.id}`} className="text-seal">{heirloom.person.displayName}</Link> now.
        </p>
      ) : null}
      {canWrite(ctx.role) ? (
        <HoldForm
          heirloomId={heirloom.id}
          people={people.map((person) => ({ id: person.id, displayName: person.displayName }))}
        />
      ) : null}
      <ol className="mt-10 space-y-3" data-testid="provenance-list">
        {holds.map((hold) => (
          <li key={hold.id} className="paper-card p-5">
            <Link href={`/people/${hold.person.id}`} className="font-display text-2xl text-seal">
              {hold.person.displayName}
            </Link>
            <p className="text-bark">
              {holdLine(hold.person.displayName, formatDate(hold.heldFrom, ""), formatDate(hold.heldUntil, "") || null)}
            </p>
            {hold.note ? <p className="mt-2 text-bark">{hold.note}</p> : null}
          </li>
        ))}
        {!holds.length ? <li className="text-bark">Who held this is not recorded yet.</li> : null}
      </ol>
    </AppShell>
  );
}
