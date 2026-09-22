import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingPlaceCardsHeading } from "@/lib/placeCards";

export default async function MissingPlaceCardsPage() {
  const ctx = await requireFamily();
  const reunions = (await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id },
    include: { seats: true },
    orderBy: { happenedOn: "asc" },
  })).filter((reunion) => !reunion.seats.length);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-place-cards-heading">
        {missingPlaceCardsHeading(reunions.length)}
      </h1>
      <ul className="mt-10 space-y-3" data-testid="missing-place-cards-list">
        {reunions.map((reunion) => (
          <li key={reunion.id} className="paper-card p-5">
            <Link href={`/reunions/${reunion.id}/placecards`} className="font-display text-2xl text-seal">
              {reunion.title}
            </Link>
          </li>
        ))}
        {!reunions.length ? <li className="text-bark">{missingPlaceCardsHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
