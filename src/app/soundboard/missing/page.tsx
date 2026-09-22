import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { alive } from "@/lib/alive";
import { hideMinorDetails } from "@/lib/privacy";
import { missingSpokenHeading } from "@/lib/soundboard";

export default async function MissingSpokenPage() {
  const ctx = await requireFamily();
  const people = await prisma.person.findMany({
    where: { familyId: ctx.family.id, ...alive, pronunciationAssetId: null },
    orderBy: { displayName: "asc" },
  });
  const missing = people.filter((person) => !hideMinorDetails(ctx.role, person));
  return (
    <AppShell>
      <h1 className="font-display text-4xl" data-testid="missing-spoken-heading">{missingSpokenHeading(missing.length)}</h1>
      <ul className="mt-8 space-y-3" data-testid="missing-spoken">
        {missing.map((person) => (
          <li key={person.id}>
            <Link href={`/people/${person.id}`} className="text-seal">{person.displayName}</Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
