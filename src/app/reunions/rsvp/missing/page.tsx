import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { missingRsvpHeading } from "@/lib/rsvpCard";

export default async function MissingRsvpPage() {
  const ctx = await requireFamily();
  const reunions = await prisma.reunionGathering.findMany({
    where: { familyId: ctx.family.id },
    include: { guests: true },
    orderBy: { title: "asc" },
  });
  const missing = reunions.filter((reunion) => !reunion.guests.length);
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-rsvp-heading">
        {missingRsvpHeading(missing.length)}
      </h1>
      <ul className="mt-8 space-y-3" data-testid="missing-rsvp">
        {missing.map((reunion) => (
          <li key={reunion.id}>
            <Link href={`/reunions/${reunion.id}`} className="text-seal">{reunion.title}</Link>
          </li>
        ))}
        {!missing.length ? <li className="text-bark">{missingRsvpHeading(0)}</li> : null}
      </ul>
    </AppShell>
  );
}
