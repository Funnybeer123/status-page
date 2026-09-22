import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isLiving } from "@/lib/privacy";
import { reunionLivingListHeading } from "@/lib/livingTree";

export default async function ReunionLivingListPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { guests: { include: { person: true } } },
  });
  if (!reunion) notFound();
  const living = reunion.guests.filter((guest) => guest.coming && isLiving(guest.person));
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{reunion.title}</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="reunion-living-heading">
        {reunionLivingListHeading(living.length)}
      </h1>
      <p className="mt-3 font-sans text-sm">
        <Link href={`/reunions/${reunion.id}/tree`} className="text-seal">Living tree</Link>
      </p>
      <ul className="mt-10 space-y-3" data-testid="reunion-living-list">
        {living.map((guest) => (
          <li key={guest.personId} className="paper-card p-5">
            <Link href={`/people/${guest.personId}`} className="font-display text-2xl text-seal">
              {guest.person.displayName}
            </Link>
          </li>
        ))}
        {!living.length ? <li className="text-bark">No living guests have said they are coming.</li> : null}
      </ul>
    </AppShell>
  );
}
