import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { hideResidenceForViewer } from "@/lib/privacy";
import { compileLivingHere, livingHereHeading } from "@/lib/livingHere";

export default async function PlaceLivingPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const place = await prisma.place.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { residences: { include: { person: true } } },
  });
  if (!place) notFound();
  const people = compileLivingHere(place.residences.filter((row) => !hideResidenceForViewer(ctx.role, row.person)));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{place.name}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="living-here-heading">
        {livingHereHeading(place.name, people.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="living-here-list">
        {people.map((person) => (
          <li key={person.id} className="paper-card p-4">
            <Link href={person.href} className="font-display text-xl text-seal">{person.displayName}</Link>
            <p className="text-bark">{person.line}</p>
          </li>
        ))}
        {!people.length ? <li className="text-bark">{livingHereHeading(place.name, 0)}</li> : null}
      </ul>
      <p className="mt-8 font-sans text-sm">
        <Link href={`/places/${place.id}`} className="text-seal">The place page</Link>
        {" · "}
        <Link href="/places/living" className="text-seal">Every place with someone still living there</Link>
      </p>
      <CiteBlock title={livingHereHeading(place.name, people.length)} path={`/places/${place.id}/living`} />
    </AppShell>
  );
}
