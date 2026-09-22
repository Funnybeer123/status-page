import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { isOralHistory, missingOralHeading } from "@/lib/oralPlaylist";
import { hideMinorDetails } from "@/lib/privacy";

export default async function MissingOralPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive },
    include: { tags: { include: { asset: true } } },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter(
    (person) => !hideMinorDetails(ctx.role, person) && !person.tags.some((tag) => tag.asset && isOralHistory(tag.asset)),
  );
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-oral-heading">{missingOralHeading(missing.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="missing-oral">
        {missing.map((person) => (
          <li key={person.id}>
            <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
