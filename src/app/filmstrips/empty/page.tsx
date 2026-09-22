import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { emptyFilmstripsHeading, isPhotoAsset } from "@/lib/filmstrip";
import { hideMinorDetails } from "@/lib/privacy";

export default async function EmptyFilmstripsPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    include: { tags: { include: { asset: true } } },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter(
    (person) => !hideMinorDetails(ctx.role, person) && !person.tags.some((tag) => tag.asset && isPhotoAsset(tag.asset)),
  );
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="empty-filmstrips-heading">{emptyFilmstripsHeading(missing.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="empty-filmstrips">
        {missing.map((person) => (
          <li key={person.id}>
            <Link href={`/people/${person.id}/filmstrip`} className="text-seal">{person.displayName}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
