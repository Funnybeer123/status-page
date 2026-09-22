import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compileRsvpCard } from "@/lib/rsvpCard";

export default async function RsvpCardPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { guests: { include: { person: true } } },
  });
  if (!reunion) notFound();
  const card = compileRsvpCard(reunion, reunion.guests);
  return (
    <AppShell>
      <article className="print:max-w-none">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Printable RSVP card</p>
        <h1 className="mt-2 font-display text-4xl" data-testid="rsvp-card-heading">{card.heading}</h1>
        <p className="mt-3 text-bark" data-testid="rsvp-card-when">{card.when}</p>
        <ul className="mt-8 space-y-2" data-testid="rsvp-card">
          {card.guests.map((guest, index) => (
            <li key={`${guest.name}-${index}`} className="paper-card p-4">
              {guest.line}
            </li>
          ))}
          {!card.guests.length ? <li className="text-bark">No one has answered yet.</li> : null}
        </ul>
        <p className="mt-8 font-sans text-sm print:hidden">
          <Link href={`/reunions/${reunion.id}`} className="text-seal">Back to the reunion</Link>
          {" · "}
          <Link href="/reunions/rsvp" className="text-seal">All RSVP cards</Link>
        </p>
        <div className="print:hidden">
          <CiteBlock title={card.heading} path={`/reunions/${reunion.id}/rsvp-card`} />
        </div>
      </article>
    </AppShell>
  );
}
