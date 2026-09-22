import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { nameTagHeading, nameTagLine } from "@/lib/nameTags";

export default async function ReunionTagsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { guests: { include: { person: true } } },
  });
  if (!reunion) notFound();
  const coming = reunion.guests.filter((guest) => guest.coming);
  return (
    <AppShell>
      <style>{`
        @media print {
          header, nav, footer, .no-print { display: none !important; }
          .name-tag { break-inside: avoid; }
        }
      `}</style>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold no-print">
        <Link href={`/reunions/${reunion.id}`} className="text-seal">Reunion</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl" data-testid="name-tags-heading">
        {nameTagHeading(reunion.title, coming.length)}
      </h1>
      <p className="mt-3 max-w-2xl text-bark no-print">Print these for the people who said they are coming.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2" data-testid="name-tags">
        {coming.map((guest) => (
          <article key={guest.personId} className="name-tag paper-card flex min-h-40 flex-col items-center justify-center p-6 text-center">
            <p className="font-display text-3xl">{guest.person.displayName}</p>
            <p className="mt-2 text-bark">{nameTagLine(guest.person.displayName, reunion.title)}</p>
          </article>
        ))}
        {!coming.length ? <p className="text-bark">No one has said they are coming.</p> : null}
      </div>
    </AppShell>
  );
}
