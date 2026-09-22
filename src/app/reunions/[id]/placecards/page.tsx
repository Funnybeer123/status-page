import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CiteBlock } from "@/components/CiteBlock";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { compilePlaceCards, placeCardsHeading } from "@/lib/placeCards";

export default async function PlaceCardsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFamily();
  const { id } = await params;
  const reunion = await prisma.reunionGathering.findFirst({
    where: { id, familyId: ctx.family.id },
    include: { seats: { include: { person: true } } },
  });
  if (!reunion) notFound();
  const cards = compilePlaceCards(reunion.title, reunion.seats);
  return (
    <AppShell>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">Printable place cards</p>
      <h1 className="mt-2 font-display text-4xl" data-testid="place-cards-heading">
        {placeCardsHeading(reunion.title, cards.length)}
      </h1>
      <p className="mt-3 text-bark print:hidden">
        One card for each seat.{" "}
        <Link href={`/reunions/${reunion.id}/seating`} className="text-seal">Seating chart</Link>
        {" · "}
        <Link href="/reunions/placecards/missing" className="text-seal">Reunions without cards</Link>
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2" data-testid="place-cards">
        {cards.map((card) => (
          <li key={card.id} className="paper-card p-8 text-center" data-testid="place-card">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-gold">{reunion.title}</p>
            <p className="mt-4 font-display text-4xl">{card.name}</p>
            <p className="mt-3 text-bark">{card.line}</p>
          </li>
        ))}
        {!cards.length ? <li className="text-bark">No one is seated yet.</li> : null}
      </ul>
      <CiteBlock title={placeCardsHeading(reunion.title, cards.length)} path={`/reunions/${reunion.id}/placecards`} />
    </AppShell>
  );
}
