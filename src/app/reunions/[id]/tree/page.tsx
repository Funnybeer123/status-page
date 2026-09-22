import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TreeView } from "@/components/TreeView";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { redactPeople } from "@/lib/privacy";
import { livingPeople, livingRelationships, reunionLivingHeading } from "@/lib/livingTree";

export default async function ReunionLivingTreePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const [reunion, people, relationships] = await Promise.all([
    prisma.reunionGathering.findFirst({
      where: { id, familyId: ctx.family.id },
      include: { guests: true },
    }),
    prisma.person.findMany({ where: { familyId: ctx.family.id, deletedAt: null } }),
    prisma.relationship.findMany({ where: { familyId: ctx.family.id } }),
  ]);
  if (!reunion) notFound();
  const visiblePeople = livingPeople(people);
  const visibleRels = livingRelationships(people, relationships);
  const coming = new Set(reunion.guests.filter((guest) => guest.coming).map((guest) => guest.personId));
  const treePeople = redactPeople(visiblePeople, ctx.role).map((person) => ({
    ...person,
    displayName: coming.has(person.id) ? `${person.displayName} · coming` : person.displayName,
    profileUrl: null,
  }));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Reunion</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="reunion-living-tree-heading">
        {reunionLivingHeading(reunion.title, treePeople.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark">
        Living relatives for {reunion.title}. Guests who said they are coming are marked.{" "}
        <Link href={`/reunions/${reunion.id}`} className="text-seal">Back to the reunion</Link>
        {" · "}
        <Link href={`/reunions/${reunion.id}/living`} className="text-seal">Living namelist</Link>.
      </p>
      <div className="mt-10" data-testid="reunion-living-tree">
        <TreeView people={treePeople} relationships={visibleRels} />
      </div>
    </AppShell>
  );
}
